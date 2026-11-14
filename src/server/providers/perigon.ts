import "server-only";
import { env } from "../lib/env";
import { getJson } from "../lib/http";
import type { NewsItem } from "../types";
import { scoreHeadline } from "../engine/sentiment";

export const perigonEnabled = () => Boolean(env.perigonKey);

type Article = {
  title: string;
  url: string;
  pubDate: string;
  source?: { domain?: string };
  sentiment?: { positive: number; negative: number; neutral: number };
};

export async function perigonNews(query: string, size = 20): Promise<NewsItem[]> {
  const sp = new URLSearchParams({ q: query, sortBy: "date", size: String(size), language: "en", apiKey: env.perigonKey });
  const data = await getJson<{ articles?: Article[] }>(`https://api.goperigon.com/v1/all?${sp}`);
  return (data?.articles ?? []).map((a) => ({
    title: a.title,
    source: a.source?.domain ?? "Perigon",
    url: a.url,
    publishedAt: a.pubDate,
    sentiment: a.sentiment ? a.sentiment.positive - a.sentiment.negative : scoreHeadline(a.title),
  }));
}
