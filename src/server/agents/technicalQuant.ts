import "server-only";
// ─── Agent C: Technical Quant Engine ─── EMA cross, RSI, MACD, Bollinger, auto S/R
import type { AgentReport, Candle, ChartPayload } from "../types";
import { atr, bollinger, ema, historicalVol, macd, rsi } from "../engine/indicators";
import { supportResistance } from "../engine/levels";
import { clamp, round } from "../lib/math";

export function runTechnicalAgent(candles: Candle[], live: boolean) {
  const closes = candles.map((c) => c.close);
  const t = candles.map((c) => c.time);
  const e20 = ema(closes, 20), e50 = ema(closes, 50), e200 = ema(closes, 200);
  const r = rsi(closes, 14);
  const m = macd(closes);
  const bb = bollinger(closes, 20, 2);
  const levels = supportResistance(candles);
  const vol = historicalVol(closes, 60);
  const a = atr(candles, 14);
  const i = closes.length - 1;
  const price = closes[i];

  const hl: string[] = [];
  let s = 50;
  let momentum = 0;

  // Trend structure
  if (price > e200[i]) { s += 7; hl.push("ราคาอยู่เหนือ EMA200 (แนวโน้มหลักขาขึ้น)"); } else { s -= 7; hl.push("ราคาอยู่ใต้ EMA200 (แนวโน้มหลักขาลง)"); }
  if (e20[i] > e50[i]) { s += 6; momentum += 0.3; } else { s -= 6; momentum -= 0.3; }

  // EMA cross detection (last 10 bars)
  const markers: ChartPayload["markers"] = [];
  for (let k = Math.max(1, i - 120); k <= i; k++) {
    const up = e20[k - 1] <= e50[k - 1] && e20[k] > e50[k];
    const dn = e20[k - 1] >= e50[k - 1] && e20[k] < e50[k];
    if (up) markers.push({ time: t[k], position: "belowBar", text: "Golden ×", color: "#16c784" });
    if (dn) markers.push({ time: t[k], position: "aboveBar", text: "Death ×", color: "#ea3943" });
    if (k > i - 10 && up) { s += 8; momentum += 0.3; hl.push("เกิด EMA20/50 Golden Cross ล่าสุด"); }
    if (k > i - 10 && dn) { s -= 8; momentum -= 0.3; hl.push("เกิด EMA20/50 Death Cross ล่าสุด"); }
  }

  // RSI
  const rv = r[i];
  if (rv > 70) { s -= 5; hl.push(`RSI ${round(rv, 1)} — Overbought ระวังแรงขายทำกำไร`); }
  else if (rv < 30) { s += 5; hl.push(`RSI ${round(rv, 1)} — Oversold มีโอกาสรีบาวด์`); }
  else { s += (rv - 50) * 0.3; hl.push(`RSI ${round(rv, 1)}`); }
  momentum += (rv - 50) / 100;

  // MACD
  if (m.hist[i] > 0 && m.hist[i] > m.hist[i - 1]) { s += 6; momentum += 0.2; hl.push("MACD Histogram บวกและขยายตัว (โมเมนตัมขึ้นแรง)"); }
  else if (m.hist[i] < 0 && m.hist[i] < m.hist[i - 1]) { s -= 6; momentum -= 0.2; hl.push("MACD Histogram ลบและขยายตัว (โมเมนตัมลงแรง)"); }
  if (m.line[i - 1] < m.signal[i - 1] && m.line[i] > m.signal[i]) { s += 5; hl.push("MACD ตัดขึ้นเหนือ Signal"); }
  if (m.line[i - 1] > m.signal[i - 1] && m.line[i] < m.signal[i]) { s -= 5; hl.push("MACD ตัดลงใต้ Signal"); }

  // Bollinger
  const bw = (bb.upper[i] - bb.lower[i]) / bb.mid[i];
  const pctB = (price - bb.lower[i]) / (bb.upper[i] - bb.lower[i]);
  if (pctB > 1) { hl.push("ราคาทะลุ Bollinger บน (Breakout / ตึงตัว)"); s += 2; }
  if (pctB < 0) { hl.push("ราคาหลุด Bollinger ล่าง"); s -= 2; }
  if (bw < 0.06) hl.push("Bollinger บีบตัว (Squeeze) — เตรียมเลือกทาง");

  // S/R proximity
  const sup = levels.filter((l) => l.kind === "support").sort((x, y) => y.price - x.price)[0];
  const res = levels.filter((l) => l.kind === "resistance").sort((x, y) => x.price - y.price)[0];
  if (sup) hl.push(`แนวรับใกล้สุด ${sup.price} (${round(((sup.price - price) / price) * 100, 1)}%)`);
  if (res) hl.push(`แนวต้านใกล้สุด ${res.price} (+${round(((res.price - price) / price) * 100, 1)}%)`);
  if (sup && res) {
    const rr = (res.price - price) / Math.max(price - sup.price, 1e-6);
    if (rr > 2) s += 4; if (rr < 0.5) s -= 4;
  }

  // 20-day rate of change
  const roc20 = (price / closes[Math.max(0, i - 20)] - 1) * 100;
  s += clamp(roc20, -15, 15) * 0.4;
  momentum += clamp(roc20 / 20, -0.3, 0.3);
  hl.push(`ผลตอบแทน 20 วัน ${round(roc20, 1)}% · HV(60) ${round(vol.annual * 100, 1)}%/ปี`);

  const series = (arr: number[]) => arr.map((v, k) => ({ time: t[k], value: round(v, 4) })).filter((p) => Number.isFinite(p.value));
  const chart: ChartPayload = {
    candles,
    overlays: { ema20: series(e20), ema50: series(e50), bbUpper: series(bb.upper), bbLower: series(bb.lower) },
    rsi: series(r),
    macd: m.line.map((v, k) => ({ time: t[k], macd: round(v, 4), signal: round(m.signal[k], 4), hist: round(m.hist[k], 4) })),
    levels,
    markers: markers.slice(-12),
  };

  const report: AgentReport = {
    agent: "C_TECHNICAL",
    title: "Agent C · Technical Quant Engine",
    score: Math.round(clamp(s, 0, 100)),
    highlights: hl,
    dataSource: live ? "live" : "demo",
  };
  return { report, chart, vol, atr: a, momentum: clamp(momentum, -1, 1) };
}
