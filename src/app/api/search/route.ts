import { NextResponse } from "next/server";
import type { SearchResult } from "@/server/types";
import { fmpEnabled, fmpSearch } from "@/server/providers/fmp";
import { UNIVERSE, countryFromSymbol } from "@/server/providers/universe";
import { cached } from "@/server/lib/cache";
import { clientIp, rateLimit } from "@/server/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!rateLimit(clientIp(req) + ":search", 120)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const q = (new URL(req.url).searchParams.get("q") || "").trim().slice(0, 40);
  if (!q) return NextResponse.json({ results: [] });
  const ql = q.toLowerCase();
  const local: SearchResult[] = UNIVERSE.filter(([s, n]) => s.toLowerCase().includes(ql) || n.toLowerCase().includes(ql)).map(([symbol, name, exchange, country, currency]) => ({ symbol, name, exchange, country, currency }));
  let remote: SearchResult[] = [];
  if (fmpEnabled()) remote = await cached(`search:${ql}`, 3600_000, () => fmpSearch(q));
  const seen = new Set<string>();
  const results = [...local, ...remote].filter((r) => !seen.has(r.symbol) && seen.add(r.symbol)).slice(0, 12);
  // Allow any well-formed ticker even when not found (e.g. "SCC.BK")
  if (!results.length && /^[A-Za-z0-9.\-^]{1,15}$/.test(q)) {
    results.push({ symbol: q.toUpperCase(), name: "Use ticker as typed", exchange: "", country: countryFromSymbol(q), currency: "" });
  }
  return NextResponse.json({ results });
}
