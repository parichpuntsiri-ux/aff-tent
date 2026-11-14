import "server-only";
// Orchestrates the four agents. All math/weights stay on the server;
// only the final AnalysisResult JSON is sent to the browser.
import type { AnalysisResult, Candle, CompanyProfile, NewsItem, StatementRow } from "../types";
import { cached } from "../lib/cache";
import { round } from "../lib/math";
import { demoCandles, demoNews, demoProfile, demoStatements } from "../providers/demo";
import { fmpDaily, fmpDividends, fmpEnabled, fmpEstimates, fmpNews, fmpProfile, fmpStatements } from "../providers/fmp";
import { aggregateSentiment } from "../engine/sentiment";
import { projectReturns } from "../engine/forecast";
import { compositeScore, decide } from "../engine/scoring";
import { runMacroAgent } from "./macroAnalyst";
import { runFundamentalAgent } from "./fundamentalAnalyst";
import { runTechnicalAgent } from "./technicalQuant";
import { runPortfolioManager } from "./portfolioManager";

export const DISCLAIMER =
  "ข้อมูลนี้จัดทำโดยระบบอัตโนมัติเพื่อการศึกษาและประกอบการตัดสินใจเท่านั้น ไม่ใช่คำแนะนำการลงทุน ผลตอบแทนที่คาดการณ์เป็นค่าทางสถิติและไม่รับประกันผล การลงทุนมีความเสี่ยง ผู้ลงทุนควรศึกษาข้อมูลก่อนตัดสินใจ";

async function loadMarketData(symbol: string) {
  let live = 0, total = 0;
  const useFmp = fmpEnabled();
  const [daily, prof, stmts, est, div, fnews] = useFmp
    ? await Promise.all([fmpDaily(symbol), fmpProfile(symbol), fmpStatements(symbol), fmpEstimates(symbol), fmpDividends(symbol), fmpNews(symbol)])
    : [null, null, null, [], null, [] as NewsItem[]];

  total++; const candles: Candle[] = daily && daily.length > 60 ? (live++, daily) : demoCandles(symbol);
  total++; const profile: CompanyProfile = prof ? (live++, prof) : demoProfile(symbol, candles);
  if (!prof && daily) { profile.price = candles[candles.length - 1].close; }
  total++; const statements: StatementRow[] = stmts?.length ? (live++, stmts) : demoStatements(symbol);
  const estimates = est ?? [];
  const lastClose = candles[candles.length - 1].close;
  const dividendYieldPct = div?.yieldPct ?? (div?.trailingAnnual ? (div.trailingAnnual / lastClose) * 100 : stmts?.length ? 0 : round(Math.abs(statements[0].dividendsPaid) / (profile.marketCap || 1) * 100, 2));
  return {
    candles, profile, statements, estimates, fnews,
    dividend: { yieldPct: round(dividendYieldPct, 2), lastPayment: div?.lastPayment, nextExDate: div?.nextExDate, frequency: div?.frequency },
    liveFrac: live / total,
  };
}

export async function analyze(symbolRaw: string): Promise<AnalysisResult> {
  const symbol = symbolRaw.toUpperCase().trim();
  return cached(`analysis:${symbol}`, 5 * 60_000, async () => {
    const md = await loadMarketData(symbol);
    const { profile, candles, statements } = md;
    if (!profile.price) profile.price = candles[candles.length - 1].close;

    // Agents A, B, C run in parallel
    const [macroOut, fundamental, technical] = await Promise.all([
      runMacroAgent(symbol, profile.name, profile.sector, profile.beta ?? 1),
      Promise.resolve(runFundamentalAgent(statements, profile.price, md.estimates, md.dividend.yieldPct, md.liveFrac > 0)),
      Promise.resolve(runTechnicalAgent(candles, md.liveFrac > 0)),
    ]);

    // News merge + sentiment meter
    let news = [...md.fnews, ...macroOut.news];
    if (!news.length) news = demoNews(symbol, profile.name);
    news = news
      .filter((n, idx, arr) => n.title && arr.findIndex((x) => x.title === n.title) === idx)
      .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
      .slice(0, 25);
    const sent = aggregateSentiment(news);

    const agents = [macroOut.report, fundamental, technical.report];
    const composite = compositeScore(agents, sent.net);
    const forecasts = projectReturns({
      compositeScore: composite, dailyVol: technical.vol.daily, meanDaily: technical.vol.meanDaily, sentimentNet: sent.net,
    });
    const dec = decide({
      agents, composite, forecasts, technicalMomentum: technical.momentum, annualVol: technical.vol.annual,
      dividendYieldPct: md.dividend.yieldPct, price: profile.price, atr: technical.atr,
    });

    const liveCount = agents.filter((a) => a.dataSource === "live").length;
    const dataMode: AnalysisResult["dataMode"] = liveCount === 3 && md.liveFrac === 1 ? "live" : liveCount === 0 && md.liveFrac === 0 ? "demo" : "mixed";

    // Agent D: Portfolio Manager
    const pm = await runPortfolioManager({
      symbol, name: profile.name, sector: profile.sector, country: profile.country, price: profile.price, currency: profile.currency,
      agents, macro: macroOut.macro, news, sentiment: { bullishPct: sent.bullishPct, bearishPct: sent.bearishPct, articles: sent.articles },
      decision: { ...dec, forecasts }, dataMode,
    });

    // Chart payload is trimmed to keep the response small
    const chart = { ...technical.chart, candles: technical.chart.candles.slice(-300) };
    const cut = chart.candles[0].time;
    const trim = <T extends { time: number }>(a: T[]) => a.filter((p) => p.time >= cut);
    chart.overlays = { ema20: trim(chart.overlays.ema20), ema50: trim(chart.overlays.ema50), bbUpper: trim(chart.overlays.bbUpper), bbLower: trim(chart.overlays.bbLower) };
    chart.rsi = trim(chart.rsi);
    chart.macd = trim(chart.macd);

    return {
      symbol,
      generatedAt: new Date().toISOString(),
      profile,
      chart,
      statements,
      dividend: md.dividend,
      estimates: md.estimates,
      news,
      macro: macroOut.macro,
      agents,
      sentiment: { bullishPct: sent.bullishPct, bearishPct: sent.bearishPct, articles: sent.articles },
      decision: { ...dec, confidence: pm.confidence, forecasts },
      brain: pm.brain,
      dataMode,
      disclaimer: DISCLAIMER,
    };
  });
}
