import "server-only";
// ─── Agent B: Fundamental Analyst ─── FMP statements, capital structure, dividends, consensus
import type { AgentReport, StatementRow } from "../types";
import { clamp, round } from "../lib/math";

type Est = { period: string; revenueAvg: number; epsAvg: number; analysts: number }[];

export function runFundamentalAgent(rows: StatementRow[], price: number, estimates: Est, dividendYieldPct: number, live: boolean) {
  const hl: string[] = [];
  let s = 50;
  const [cur, prev, , , old] = rows;
  if (cur && prev && prev.revenue) {
    const g = (cur.revenue / prev.revenue - 1) * 100;
    s += clamp(g, -20, 30) * 0.6;
    hl.push(`รายได้เติบโต ${round(g, 1)}% YoY`);
  }
  if (cur && old && old.revenue > 0 && cur.revenue > 0) {
    const cagr = ((cur.revenue / old.revenue) ** (1 / 4) - 1) * 100;
    hl.push(`CAGR รายได้ 4 ปี ${round(cagr, 1)}%`);
    s += clamp(cagr, -10, 25) * 0.3;
  }
  if (cur?.revenue) {
    const nm = (cur.netIncome / cur.revenue) * 100;
    hl.push(`อัตรากำไรสุทธิ ${round(nm, 1)}%`);
    s += clamp(nm, -20, 35) * 0.3;
    if (prev?.revenue) {
      const prevNm = (prev.netIncome / prev.revenue) * 100;
      if (nm > prevNm + 1) { s += 4; hl.push("Margin ขยายตัว (Operating leverage)"); }
      if (nm < prevNm - 1) { s -= 4; hl.push("Margin หดตัว"); }
    }
  }
  if (cur?.totalEquity) {
    const roe = (cur.netIncome / cur.totalEquity) * 100;
    const de = cur.totalDebt / cur.totalEquity;
    hl.push(`ROE ${round(roe, 1)}% · D/E ${round(de, 2)}x`);
    s += clamp(roe, -20, 40) * 0.25;
    if (de > 2) { s -= 8; hl.push("โครงสร้างทุนมีหนี้สูง"); }
    else if (de < 0.5) s += 3;
  }
  if (cur && cur.freeCashFlow > 0) { s += 4; hl.push(`Free cash flow เป็นบวก`); }
  else if (cur) { s -= 5; hl.push("Free cash flow ติดลบ"); }

  if (cur?.eps && cur.eps > 0) {
    const pe = price / cur.eps;
    hl.push(`P/E ย้อนหลัง ${round(pe, 1)}x`);
    if (pe > 60) s -= 8; else if (pe < 15) s += 6;
  }
  const nextEst = estimates.find((e) => Number(e.period) > new Date().getUTCFullYear() - 1);
  if (nextEst && cur?.eps) {
    const epsG = (nextEst.epsAvg / cur.eps - 1) * 100;
    hl.push(`Consensus EPS ปี ${nextEst.period}: ${round(nextEst.epsAvg, 2)} (${epsG >= 0 ? "+" : ""}${round(epsG, 1)}%, ${nextEst.analysts} นักวิเคราะห์)`);
    s += clamp(epsG, -20, 30) * 0.25;
    if (nextEst.epsAvg > 0) hl.push(`Forward P/E ${round(price / nextEst.epsAvg, 1)}x`);
  }
  if (dividendYieldPct > 0) hl.push(`อัตราปันผล ${round(dividendYieldPct, 2)}%`);

  const report: AgentReport = {
    agent: "B_FUNDAMENTAL",
    title: "Agent B · Fundamental Analyst",
    score: Math.round(clamp(s, 0, 100)),
    highlights: hl,
    dataSource: live ? "live" : "demo",
  };
  return report;
}
