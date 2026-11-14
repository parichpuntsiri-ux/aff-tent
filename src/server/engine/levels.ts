import "server-only";
import type { Candle, LevelLine } from "../types";

/**
 * Auto support/resistance: find swing pivots, cluster nearby pivots,
 * rank clusters by touches and recency, return the nearest levels.
 */
export function supportResistance(c: Candle[], window = 5, maxLevels = 6): LevelLine[] {
  const data = c.slice(-250);
  const pivots: { price: number; idx: number }[] = [];
  for (let i = window; i < data.length - window; i++) {
    const seg = data.slice(i - window, i + window + 1);
    if (data[i].high === Math.max(...seg.map((x) => x.high))) pivots.push({ price: data[i].high, idx: i });
    if (data[i].low === Math.min(...seg.map((x) => x.low))) pivots.push({ price: data[i].low, idx: i });
  }
  const last = data[data.length - 1].close;
  const tol = last * 0.015;
  const clusters: { price: number; touches: number; recency: number }[] = [];
  for (const p of pivots.sort((a, b) => a.price - b.price)) {
    const cl = clusters.find((x) => Math.abs(x.price - p.price) < tol);
    if (cl) {
      cl.price = (cl.price * cl.touches + p.price) / (cl.touches + 1);
      cl.touches++;
      cl.recency = Math.max(cl.recency, p.idx / data.length);
    } else clusters.push({ price: p.price, touches: 1, recency: p.idx / data.length });
  }
  return clusters
    .map((cl) => ({ ...cl, rank: cl.touches + cl.recency * 2 - Math.abs(cl.price - last) / last * 10 }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, maxLevels)
    .map((cl) => ({
      price: Math.round(cl.price * 100) / 100,
      kind: cl.price < last ? ("support" as const) : ("resistance" as const),
      strength: Math.min(5, cl.touches),
    }))
    .sort((a, b) => b.price - a.price);
}
