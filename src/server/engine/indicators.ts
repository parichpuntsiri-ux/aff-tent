import "server-only";
import type { Candle } from "../types";

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0];
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

export function sma(values: number[], period: number): number[] {
  const out: number[] = [];
  let sum = 0;
  values.forEach((v, i) => {
    sum += v;
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : NaN);
  });
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  const out: number[] = new Array(closes.length).fill(NaN);
  let gain = 0, loss = 0;
  for (let i = 1; i < closes.length; i++) {
    const ch = closes[i] - closes[i - 1];
    const g = Math.max(ch, 0), l = Math.max(-ch, 0);
    if (i <= period) {
      gain += g; loss += l;
      if (i === period) { gain /= period; loss /= period; out[i] = 100 - 100 / (1 + gain / (loss || 1e-9)); }
    } else {
      gain = (gain * (period - 1) + g) / period;
      loss = (loss * (period - 1) + l) / period;
      out[i] = 100 - 100 / (1 + gain / (loss || 1e-9));
    }
  }
  return out;
}

export function macd(closes: number[], fast = 12, slow = 26, sig = 9) {
  const f = ema(closes, fast), s = ema(closes, slow);
  const line = closes.map((_, i) => f[i] - s[i]);
  const signal = ema(line, sig);
  return { line, signal, hist: line.map((v, i) => v - signal[i]) };
}

export function bollinger(closes: number[], period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper: number[] = [], lower: number[] = [];
  closes.forEach((_, i) => {
    if (i < period - 1) { upper.push(NaN); lower.push(NaN); return; }
    const slice = closes.slice(i - period + 1, i + 1);
    const m = mid[i];
    const sd = Math.sqrt(slice.reduce((a, v) => a + (v - m) ** 2, 0) / period);
    upper.push(m + mult * sd); lower.push(m - mult * sd);
  });
  return { mid, upper, lower };
}

export function atr(c: Candle[], period = 14): number {
  const tr = c.slice(1).map((x, i) => Math.max(x.high - x.low, Math.abs(x.high - c[i].close), Math.abs(x.low - c[i].close)));
  const recent = tr.slice(-period);
  return recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1);
}

/** Annualised and daily historical volatility from log returns. */
export function historicalVol(closes: number[], lookback = 60) {
  const r = closes.slice(-lookback - 1).map((v, i, a) => (i ? Math.log(v / a[i - 1]) : 0)).slice(1);
  const mean = r.reduce((a, b) => a + b, 0) / Math.max(r.length, 1);
  const variance = r.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(r.length - 1, 1);
  const daily = Math.sqrt(variance);
  return { daily, annual: daily * Math.sqrt(252), meanDaily: mean };
}
