import "server-only";
import type { ForecastHorizon } from "../types";
import { clamp, normCdf, round } from "../lib/math";

export const HORIZONS: { label: string; hours: number; days: number }[] = [
  { label: "24 ชั่วโมง", hours: 24, days: 1 },
  { label: "5 วัน", hours: 120, days: 5 },
  { label: "20 วัน (1 เดือน)", hours: 480, days: 21 },
  { label: "3 เดือน", hours: 1512, days: 63 },
  { label: "6 เดือน", hours: 3024, days: 126 },
];

/**
 * Statistical projection: drift is a blend of (a) the composite score tilt, scaled by
 * volatility, and (b) a shrunken historical mean; dispersion = daily HV × √t.
 * Output is directional (positive = in favour of the long side).
 */
export function projectReturns(opts: {
  compositeScore: number; // 0..100
  dailyVol: number;
  meanDaily: number;
  sentimentNet: number; // -1..1
}): ForecastHorizon[] {
  const tilt = (opts.compositeScore - 50) / 50; // -1..1
  return HORIZONS.map((h) => {
    const sigma = opts.dailyVol * Math.sqrt(h.days);
    // Alpha decays with horizon: signal edge is strongest short-term, mean-reverts longer.
    // (edge grows with √t up to 5 days, then stays proportional to σ only)
    const edge = tilt * 0.35 * sigma * (h.days <= 5 ? Math.sqrt(h.days / 5) : 1);
    const sentimentKick = opts.sentimentNet * 0.1 * sigma * (h.days <= 5 ? 1 : 0.4);
    const histDrift = clamp(opts.meanDaily, -0.002, 0.002) * h.days * 0.3;
    const mu = edge + sentimentKick + histDrift; // log return
    const exp = (Math.exp(mu + (sigma * sigma) / 2) - 1) * 100;
    return {
      label: h.label,
      hours: h.hours,
      expectedReturnPct: round(exp, 2),
      rangeLowPct: round((Math.exp(mu - 0.674 * sigma) - 1) * 100, 2),
      rangeHighPct: round((Math.exp(mu + 0.674 * sigma) - 1) * 100, 2),
      probabilityOfProfit: round(normCdf(mu / Math.max(sigma, 1e-9)) * 100, 1),
    };
  });
}
