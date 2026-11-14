// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { ema, rsi, macd, bollinger, historicalVol } from "../src/server/engine/indicators";
import { projectReturns } from "../src/server/engine/forecast";
import { compositeScore, decide } from "../src/server/engine/scoring";
import { supportResistance } from "../src/server/engine/levels";
import { aggregateSentiment, scoreHeadline } from "../src/server/engine/sentiment";
import { demoCandles } from "../src/server/providers/demo";

test("EMA of a constant series is constant", () => {
  assert.deepEqual(ema([5, 5, 5, 5], 3), [5, 5, 5, 5]);
});

test("RSI is 100 on a strictly rising series and in [0,100] otherwise", () => {
  const up = Array.from({ length: 40 }, (_, i) => 100 + i);
  assert.ok(rsi(up)[39] > 99);
  const c = demoCandles("TEST").map((x) => x.close);
  for (const v of rsi(c).filter(Number.isFinite)) assert.ok(v >= 0 && v <= 100);
});

test("MACD histogram = line - signal; Bollinger upper >= lower", () => {
  const c = demoCandles("AAPL").map((x) => x.close);
  const m = macd(c);
  const i = c.length - 1;
  assert.ok(Math.abs(m.hist[i] - (m.line[i] - m.signal[i])) < 1e-9);
  const bb = bollinger(c);
  assert.ok(bb.upper[i] >= bb.lower[i]);
});

test("forecast: bullish score gives higher expectation than bearish; ranges ordered", () => {
  const base = { dailyVol: 0.02, meanDaily: 0, sentimentNet: 0 };
  const bull = projectReturns({ ...base, compositeScore: 80 });
  const bear = projectReturns({ ...base, compositeScore: 20 });
  bull.forEach((f, k) => {
    assert.ok(f.expectedReturnPct > bear[k].expectedReturnPct);
    assert.ok(f.rangeLowPct < f.rangeHighPct);
    assert.ok(f.probabilityOfProfit > 50);
  });
});

test("scoring: confidence in 1..99 and action follows composite", () => {
  const agents = [
    { agent: "A_MACRO" as const, title: "", score: 85, highlights: [], dataSource: "live" as const },
    { agent: "B_FUNDAMENTAL" as const, title: "", score: 85, highlights: [], dataSource: "live" as const },
    { agent: "C_TECHNICAL" as const, title: "", score: 85, highlights: [], dataSource: "live" as const },
  ];
  const composite = compositeScore(agents, 0.5);
  const forecasts = projectReturns({ compositeScore: composite, dailyVol: 0.02, meanDaily: 0, sentimentNet: 0.5 });
  const d = decide({ agents, composite, forecasts, technicalMomentum: 0.8, annualVol: 0.3, dividendYieldPct: 1, price: 100, atr: 2 });
  assert.ok(["CALL", "BUY"].includes(d.action));
  assert.ok(d.confidence >= 1 && d.confidence <= 99);
  assert.ok(d.stopLoss < 100 && d.takeProfit > 100);
});

test("support/resistance levels sit on the correct side of price", () => {
  const c = demoCandles("NVDA");
  const last = c[c.length - 1].close;
  for (const l of supportResistance(c)) assert.equal(l.kind, l.price < last ? "support" : "resistance");
});

test("sentiment lexicon and aggregation", () => {
  assert.ok(scoreHeadline("Company beats estimates, raises guidance") > 0);
  assert.ok(scoreHeadline("Shares plunge after downgrade and lawsuit") < 0);
  const s = aggregateSentiment([{ sentiment: 1, publishedAt: new Date().toISOString() }]);
  assert.equal(s.bullishPct + s.bearishPct, 100);
  assert.ok(historicalVol(demoCandles("X").map((x) => x.close)).annual > 0);
});
