import "server-only";

// Lightweight finance lexicon used when the news provider gives no sentiment score.
const POS = ["beat", "beats", "surge", "soar", "record", "upgrade", "raise", "raises", "strong", "growth", "profit", "buyback", "outperform", "bullish", "rally", "gain", "gains", "expands", "expansion", "approval", "partnership", "dividend hike", "tops", "jumps", "launch"];
const NEG = ["miss", "misses", "plunge", "slump", "downgrade", "cut", "cuts", "weak", "loss", "lawsuit", "probe", "investigation", "recall", "bearish", "fall", "falls", "drop", "drops", "slip", "slips", "warning", "cautious", "layoff", "fraud", "default", "tariff", "review", "decline", "sell-off"];

/** Returns -1..1 */
export function scoreHeadline(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  for (const w of POS) if (t.includes(w)) s += 1;
  for (const w of NEG) if (t.includes(w)) s -= 1;
  return Math.max(-1, Math.min(1, s / 3));
}

/** Recency-weighted bull/bear split from article sentiments. */
export function aggregateSentiment(items: { sentiment: number; publishedAt: string }[]) {
  if (!items.length) return { bullishPct: 50, bearishPct: 50, articles: 0, net: 0 };
  let w = 0, s = 0;
  for (const it of items) {
    const ageH = Math.max(0, (Date.now() - new Date(it.publishedAt).getTime()) / 3600_000);
    const weight = Math.exp(-ageH / 72); // 3-day half-life-ish decay
    w += weight;
    s += weight * it.sentiment;
  }
  const net = w ? s / w : 0; // -1..1
  const bullishPct = Math.round(50 + net * 50);
  return { bullishPct, bearishPct: 100 - bullishPct, articles: items.length, net };
}
