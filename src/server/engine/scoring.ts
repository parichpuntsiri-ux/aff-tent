import "server-only";
import type { AgentReport, ForecastHorizon, SignalAction } from "../types";
import { clamp, round } from "../lib/math";

// ── Proprietary weights (server-side only) ──
const W = { macro: 0.2, fundamental: 0.35, technical: 0.45 };

export function compositeScore(agents: AgentReport[], sentimentNet: number): number {
  const get = (k: AgentReport["agent"]) => agents.find((a) => a.agent === k)?.score ?? 50;
  const base = W.macro * get("A_MACRO") + W.fundamental * get("B_FUNDAMENTAL") + W.technical * get("C_TECHNICAL");
  return clamp(base + sentimentNet * 6, 0, 100);
}

/** Agreement among agents raises confidence; disagreement lowers it. */
function agreement(agents: AgentReport[]): number {
  const dirs = agents.map((a) => Math.sign(a.score - 50));
  const same = Math.abs(dirs.reduce((a, b) => a + b, 0));
  return same / Math.max(agents.length, 1); // 0..1
}

export function decide(opts: {
  agents: AgentReport[];
  composite: number;
  forecasts: ForecastHorizon[];
  technicalMomentum: number; // -1..1 short-term momentum strength
  annualVol: number;
  dividendYieldPct: number;
  price: number;
  atr: number;
}) {
  const { composite, agents } = opts;
  const distance = Math.abs(composite - 50) / 50; // 0..1
  const agree = agreement(agents);
  let confidence = 35 + distance * 55 + agree * 12 - Math.max(0, opts.annualVol - 0.6) * 20;
  confidence = clamp(Math.round(confidence), 1, 99);

  // Pick action
  let action: SignalAction = "HOLD";
  const strongMomentum = Math.abs(opts.technicalMomentum) > 0.45;
  if (composite >= 72 && strongMomentum && opts.technicalMomentum > 0 && confidence >= 75) action = "CALL";
  else if (composite <= 28 && strongMomentum && opts.technicalMomentum < 0 && confidence >= 75) action = "PUT";
  else if (composite >= 57) action = "BUY";
  else if (composite <= 43) action = "SELL";
  if (action === "HOLD") confidence = clamp(Math.round(40 + (1 - distance) * 20), 1, 70);

  // Choose the horizon with the best risk-adjusted directional expectancy
  const dir = action === "SELL" || action === "PUT" ? -1 : 1;
  const ranked = [...opts.forecasts].sort((a, b) => {
    const sa = (dir * a.expectedReturnPct) / Math.max(a.rangeHighPct - a.rangeLowPct, 0.1);
    const sb = (dir * b.expectedReturnPct) / Math.max(b.rangeHighPct - b.rangeLowPct, 0.1);
    return sb - sa;
  });
  const pool = action === "CALL" || action === "PUT" ? opts.forecasts.filter((f) => f.hours <= 480) : opts.forecasts;
  const best = action === "HOLD" ? opts.forecasts[2] : ranked.find((r) => pool.includes(r)) ?? opts.forecasts[2];

  const capitalGain = round(dir * best.expectedReturnPct, 2);
  // dividend accrued over the holding period (hours/24 = trading days)
  const divPart = action === "BUY" ? round((opts.dividendYieldPct * best.hours) / 24 / 252, 2) : 0;

  const stop = dir > 0 ? opts.price - 2 * opts.atr : opts.price + 2 * opts.atr;
  const take = dir > 0 ? opts.price + 3 * opts.atr : opts.price - 3 * opts.atr;

  return {
    action,
    confidence,
    horizonLabel: best.label,
    expectedCapitalGainPct: action === "HOLD" ? 0 : capitalGain,
    expectedDividendYieldPct: divPart,
    expectedTotalReturnPct: action === "HOLD" ? 0 : round(capitalGain + divPart, 2),
    stopLoss: round(stop, 2),
    takeProfit: round(take, 2),
  };
}
