import "server-only";
import type { Candle, CompanyProfile, NewsItem, StatementRow } from "../types";
import { gaussian, round, seeded } from "../lib/math";
import { countryFromSymbol, universeLookup } from "./universe";

// Deterministic synthetic data used when an API key is missing.
// Clearly flagged as "demo" in every response.

export function demoCandles(symbol: string, days = 400): Candle[] {
  const u = universeLookup(symbol);
  const rand = seeded(symbol + ":px");
  let price = u?.[7] ?? 20 + rand() * 180;
  const drift = (rand() - 0.45) * 0.0012;
  const vol = 0.012 + rand() * 0.018;
  const out: Candle[] = [];
  const start = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()) / 1000 - days * 86400;
  // Walk backward to make the last close ≈ base price
  const rets: number[] = [];
  for (let i = 0; i < days; i++) rets.push(drift + vol * gaussian(rand) + 0.004 * Math.sin(i / 23));
  const total = rets.reduce((a, b) => a + b, 0);
  price = price / Math.exp(total);
  for (let i = 0; i < days; i++) {
    const t = start + i * 86400;
    const dow = new Date(t * 1000).getUTCDay();
    const open = price;
    price = price * Math.exp(rets[i]);
    if (dow === 0 || dow === 6) continue;
    const hi = Math.max(open, price) * (1 + Math.abs(gaussian(rand)) * vol * 0.4);
    const lo = Math.min(open, price) * (1 - Math.abs(gaussian(rand)) * vol * 0.4);
    out.push({ time: t, open: round(open, 4), high: round(hi, 4), low: round(lo, 4), close: round(price, 4), volume: Math.round(1e6 * (1 + rand() * 4)) });
  }
  return out;
}

export function demoProfile(symbol: string, candles: Candle[]): CompanyProfile {
  const u = universeLookup(symbol);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? last;
  return {
    symbol: symbol.toUpperCase(),
    name: u?.[1] ?? `${symbol.toUpperCase()} Corp.`,
    exchange: u?.[2] ?? "—",
    country: u?.[3] ?? countryFromSymbol(symbol),
    currency: u?.[4] ?? "USD",
    sector: u?.[5] ?? "Unknown",
    industry: u?.[6] ?? "Unknown",
    description:
      "ข้อมูลตัวอย่าง (DEMO): ใส่ FMP_API_KEY ในไฟล์ .env.local เพื่อดึงโปรไฟล์บริษัท งบการเงิน และราคาจริง " +
      "Demo data — add an FMP API key to load the real company profile, statements and live prices.",
    marketCap: round(last.close * 1e9 * (1 + seeded(symbol)() * 20), 0),
    price: last.close,
    changePct: round(((last.close - prev.close) / prev.close) * 100, 2),
    beta: round(0.7 + seeded(symbol + "b")() * 1.0, 2),
  };
}

export function demoStatements(symbol: string): StatementRow[] {
  const rand = seeded(symbol + ":fs");
  const year = new Date().getUTCFullYear();
  let revenue = 5e9 + rand() * 80e9;
  const growth = 0.02 + rand() * 0.15;
  const rows: StatementRow[] = [];
  for (let i = 4; i >= 0; i--) {
    const gm = 0.3 + rand() * 0.3;
    const om = gm * (0.35 + rand() * 0.3);
    const ni = revenue * om * 0.8;
    const assets = revenue * (1.2 + rand());
    const liab = assets * (0.35 + rand() * 0.3);
    const ocf = ni * (1.05 + rand() * 0.3);
    const capex = -revenue * (0.04 + rand() * 0.05);
    rows.unshift({
      period: `FY${year - 1 - (4 - i)}`,
      revenue,
      grossProfit: revenue * gm,
      operatingIncome: revenue * om,
      netIncome: ni,
      eps: round(ni / 1.5e9, 2),
      totalAssets: assets,
      totalLiabilities: liab,
      totalEquity: assets - liab,
      totalDebt: liab * 0.5,
      cash: assets * 0.12,
      operatingCashFlow: ocf,
      capex,
      freeCashFlow: ocf + capex,
      dividendsPaid: -ni * (0.2 + rand() * 0.3),
    });
    revenue *= 1 + growth + (rand() - 0.5) * 0.06;
  }
  return rows.reverse(); // newest first
}

export function demoNews(symbol: string, name: string): NewsItem[] {
  const rand = seeded(symbol + ":news");
  const templates: [string, number][] = [
    [`${name} beats quarterly earnings expectations`, 0.7],
    [`Analysts raise price target on ${symbol}`, 0.6],
    [`${name} announces expansion into new markets`, 0.4],
    [`Regulators open review into ${name} business practices`, -0.6],
    [`${symbol} shares slip as sector rotates`, -0.3],
    [`${name} guidance cautious amid macro uncertainty`, -0.4],
    [`Institutional investors add to ${symbol} positions`, 0.5],
    [`${name} launches new product line`, 0.3],
  ];
  return templates
    .filter(() => rand() > 0.3)
    .map(([title, s], i) => ({
      title: `[DEMO] ${title}`,
      source: "Demo Wire",
      url: "#",
      publishedAt: new Date(Date.now() - i * 5 * 3600_000).toISOString(),
      sentiment: round(s * (0.6 + rand() * 0.6), 2),
    }));
}
