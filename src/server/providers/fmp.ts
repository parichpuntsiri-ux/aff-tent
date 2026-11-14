import "server-only";
import { env } from "../lib/env";
import { getJson } from "../lib/http";
import type { Candle, CompanyProfile, NewsItem, SearchResult, StatementRow } from "../types";
import { countryFromSymbol } from "./universe";
import { scoreHeadline } from "../engine/sentiment";

const BASE = "https://financialmodelingprep.com/stable";
const q = (path: string, params: Record<string, string | number>) => {
  const sp = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), apikey: env.fmpKey });
  return `${BASE}/${path}?${sp}`;
};

export const fmpEnabled = () => Boolean(env.fmpKey);

type Any = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function fmpSearch(query: string): Promise<SearchResult[]> {
  const [bySym, byName] = await Promise.all([
    getJson<Any[]>(q("search-symbol", { query, limit: 10 })),
    getJson<Any[]>(q("search-name", { query, limit: 10 })),
  ]);
  const seen = new Set<string>();
  return [...(bySym ?? []), ...(byName ?? [])]
    .filter((r) => r?.symbol && !seen.has(r.symbol) && seen.add(r.symbol))
    .slice(0, 12)
    .map((r) => ({
      symbol: r.symbol,
      name: r.name ?? r.symbol,
      exchange: r.exchange ?? r.exchangeFullName ?? "",
      country: countryFromSymbol(r.symbol),
      currency: r.currency,
    }));
}

export async function fmpProfile(symbol: string): Promise<CompanyProfile | null> {
  const data = await getJson<Any[]>(q("profile", { symbol }));
  const p = data?.[0];
  if (!p) return null;
  return {
    symbol: p.symbol,
    name: p.companyName ?? symbol,
    country: p.country ?? countryFromSymbol(symbol),
    exchange: p.exchange ?? p.exchangeFullName ?? "",
    currency: p.currency ?? "USD",
    sector: p.sector ?? "—",
    industry: p.industry ?? "—",
    description: p.description ?? "",
    website: p.website,
    ceo: p.ceo,
    employees: p.fullTimeEmployees ? Number(p.fullTimeEmployees) : undefined,
    marketCap: p.marketCap ?? p.mktCap,
    price: Number(p.price),
    changePct: Number(p.changePercentage ?? p.changesPercentage ?? 0),
    beta: p.beta,
    image: p.image,
  };
}

export async function fmpDaily(symbol: string): Promise<Candle[] | null> {
  const from = new Date(Date.now() - 600 * 86400_000).toISOString().slice(0, 10);
  const data = await getJson<Any[] | { historical: Any[] }>(q("historical-price-eod/full", { symbol, from }));
  const rows = Array.isArray(data) ? data : data?.historical;
  if (!rows?.length) return null;
  return rows
    .map((r) => ({
      time: Math.floor(new Date(r.date + "T00:00:00Z").getTime() / 1000),
      open: +r.open, high: +r.high, low: +r.low, close: +r.close, volume: +r.volume,
    }))
    .sort((a, b) => a.time - b.time);
}

export async function fmpQuote(symbol: string): Promise<{ price: number; changePct: number; time: number } | null> {
  const data = await getJson<Any[]>(q("quote", { symbol }), undefined, 5000);
  const r = data?.[0];
  if (!r) return null;
  return { price: +r.price, changePct: +(r.changePercentage ?? r.changesPercentage ?? 0), time: r.timestamp ?? Math.floor(Date.now() / 1000) };
}

export async function fmpStatements(symbol: string): Promise<StatementRow[] | null> {
  const [inc, bal, cf] = await Promise.all([
    getJson<Any[]>(q("income-statement", { symbol, limit: 5 })),
    getJson<Any[]>(q("balance-sheet-statement", { symbol, limit: 5 })),
    getJson<Any[]>(q("cash-flow-statement", { symbol, limit: 5 })),
  ]);
  if (!inc?.length) return null;
  return inc.map((i, idx) => {
    const b = bal?.[idx] ?? {};
    const c = cf?.[idx] ?? {};
    return {
      period: `${i.period === "FY" ? "FY" : i.period ?? "FY"}${i.fiscalYear ?? i.calendarYear ?? String(i.date).slice(0, 4)}`,
      revenue: +i.revenue || 0,
      grossProfit: +i.grossProfit || 0,
      operatingIncome: +i.operatingIncome || 0,
      netIncome: +i.netIncome || 0,
      eps: +(i.epsDiluted ?? i.epsdiluted ?? i.eps) || 0,
      totalAssets: +b.totalAssets || 0,
      totalLiabilities: +b.totalLiabilities || 0,
      totalEquity: +(b.totalStockholdersEquity ?? b.totalEquity) || 0,
      totalDebt: +b.totalDebt || 0,
      cash: +(b.cashAndCashEquivalents ?? b.cashAndShortTermInvestments) || 0,
      operatingCashFlow: +(c.operatingCashFlow ?? c.netCashProvidedByOperatingActivities) || 0,
      freeCashFlow: +c.freeCashFlow || 0,
      capex: +c.capitalExpenditure || 0,
      dividendsPaid: +(c.commonDividendsPaid ?? c.dividendsPaid ?? c.netDividendsPaid) || 0,
    };
  });
}

export async function fmpEstimates(symbol: string) {
  const data = await getJson<Any[]>(q("analyst-estimates", { symbol, period: "annual", limit: 4 }));
  return (data ?? []).map((e) => ({
    period: String(e.date).slice(0, 4),
    revenueAvg: +(e.revenueAvg ?? e.estimatedRevenueAvg) || 0,
    epsAvg: +(e.epsAvg ?? e.estimatedEpsAvg) || 0,
    analysts: +(e.numAnalystsEps ?? e.numberAnalystsEstimatedEps ?? 0) || 0,
  }));
}

export async function fmpDividends(symbol: string) {
  const data = await getJson<Any[]>(q("dividends", { symbol, limit: 12 }));
  if (!data?.length) return null;
  const last = data[0];
  return {
    lastPayment: last.paymentDate ?? last.date,
    nextExDate: new Date(last.date) > new Date() ? last.date : undefined,
    frequency: last.frequency,
    trailingAnnual: data
      .filter((d) => new Date(d.date).getTime() > Date.now() - 365 * 86400_000)
      .reduce((s, d) => s + (+d.adjDividend || +d.dividend || 0), 0),
    yieldPct: last.yield ? +last.yield : undefined,
  };
}

export async function fmpNews(symbol: string): Promise<NewsItem[]> {
  const data = await getJson<Any[]>(q("news/stock", { symbols: symbol, limit: 20 }));
  return (data ?? []).map((n) => ({
    title: n.title,
    source: n.publisher ?? n.site ?? "FMP",
    url: n.url,
    publishedAt: n.publishedDate,
    sentiment: scoreHeadline(`${n.title} ${n.text ?? ""}`),
  }));
}
