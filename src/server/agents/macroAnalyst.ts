import "server-only";
// ─── Agent A: Macro Analyst ─── FRED (policy rates, yields, CPI, jobs, VIX) + Perigon news
import type { AgentReport, MacroSnapshot, NewsItem } from "../types";
import { fredEnabled, fredSeries } from "../providers/fred";
import { perigonEnabled, perigonNews } from "../providers/perigon";
import { cached } from "../lib/cache";
import { clamp, round } from "../lib/math";

async function loadMacro(): Promise<{ snap: MacroSnapshot; live: boolean }> {
  if (!fredEnabled()) {
    return {
      live: false,
      snap: {
        fedFunds: 3.88, us10y: 4.12, us2y: 3.55, cpiYoY: 2.8, unemployment: 4.3, vix: 17.5,
        regime: "EASING", riskAppetite: "RISK_ON",
        notes: ["[DEMO] ใส่ FRED_API_KEY เพื่อดึงข้อมูลเศรษฐกิจมหภาคจริง"],
      },
    };
  }
  const [ff, y10, y2, cpi, un, vix] = await Promise.all([
    fredSeries("FEDFUNDS", 13), fredSeries("DGS10", 10), fredSeries("DGS2", 10),
    fredSeries("CPIAUCSL", 13), fredSeries("UNRATE", 4), fredSeries("VIXCLS", 10),
  ]);
  const cpiYoY = cpi.length >= 13 ? round((cpi[0] / cpi[12] - 1) * 100, 2) : null;
  const ffChange = ff.length >= 7 ? ff[0] - ff[6] : 0;
  const regime: MacroSnapshot["regime"] = ffChange < -0.2 ? "EASING" : ffChange > 0.2 ? "TIGHTENING" : "NEUTRAL";
  const v = vix[0] ?? null;
  const curve = y10[0] != null && y2[0] != null ? y10[0] - y2[0] : null;
  const riskAppetite: MacroSnapshot["riskAppetite"] = v == null ? "MIXED" : v < 18 ? "RISK_ON" : v > 25 ? "RISK_OFF" : "MIXED";
  const notes: string[] = [];
  notes.push(`ดอกเบี้ยนโยบาย Fed ${ff[0] ?? "—"}% (${regime === "EASING" ? "วัฏจักรผ่อนคลาย" : regime === "TIGHTENING" ? "วัฏจักรตึงตัว" : "ทรงตัว"}, เปลี่ยน ${round(ffChange, 2)}% ใน 6 เดือน)`);
  if (curve != null) notes.push(`Yield curve 10Y-2Y = ${round(curve, 2)}% ${curve < 0 ? "(Inverted — สัญญาณเตือนเศรษฐกิจชะลอ)" : "(ปกติ)"}`);
  if (cpiYoY != null) notes.push(`เงินเฟ้อ CPI YoY ${cpiYoY}%`);
  if (v != null) notes.push(`VIX ${v} → ${riskAppetite === "RISK_ON" ? "ตลาดเปิดรับความเสี่ยง" : riskAppetite === "RISK_OFF" ? "ตลาดกลัวความเสี่ยง" : "ผสม"}`);
  return {
    live: true,
    snap: { fedFunds: ff[0] ?? null, us10y: y10[0] ?? null, us2y: y2[0] ?? null, cpiYoY, unemployment: un[0] ?? null, vix: v, regime, riskAppetite, notes },
  };
}

export async function runMacroAgent(symbol: string, companyName: string, sector: string, beta = 1) {
  const { snap, live } = await cached("macro", 30 * 60_000, loadMacro);
  const macroNews: NewsItem[] = perigonEnabled()
    ? await cached(`perigon:${symbol}`, 10 * 60_000, () => perigonNews(`"${companyName}" OR ${symbol.split(".")[0]}`))
    : [];

  let s = 50;
  if (snap.regime === "EASING") s += 10;
  if (snap.regime === "TIGHTENING") s -= 10;
  if (snap.riskAppetite === "RISK_ON") s += 8 * beta;
  if (snap.riskAppetite === "RISK_OFF") s -= 10 * beta;
  if (snap.us10y != null && snap.us10y > 4.75 && ["Technology", "Real Estate", "Utilities"].includes(sector)) s -= 8;
  if (snap.cpiYoY != null && snap.cpiYoY > 3.5) s -= 5;
  if (snap.us10y != null && snap.us2y != null && snap.us10y - snap.us2y < 0) s -= 4;

  const report: AgentReport = {
    agent: "A_MACRO",
    title: "Agent A · Macro Analyst",
    score: Math.round(clamp(s, 0, 100)),
    highlights: snap.notes,
    dataSource: live ? "live" : "demo",
  };
  return { report, macro: snap, news: macroNews };
}
