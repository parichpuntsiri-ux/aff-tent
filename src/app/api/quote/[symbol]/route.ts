import { NextResponse } from "next/server";
import { fmpEnabled, fmpQuote } from "@/server/providers/fmp";
import { cached } from "@/server/lib/cache";
import { seeded } from "@/server/lib/math";
import { clientIp, rateLimit } from "@/server/lib/rateLimit";

export const dynamic = "force-dynamic";

// Lightweight real-time tick used by the chart to update the last candle.
export async function GET(req: Request, { params }: { params: { symbol: string } }) {
  if (!rateLimit(clientIp(req) + ":quote", 240)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  if (!/^[A-Z0-9.\-^]{1,15}$/.test(symbol)) return NextResponse.json({ error: "invalid_symbol" }, { status: 400 });
  const base = Number(new URL(req.url).searchParams.get("ref")) || 0;
  if (fmpEnabled()) {
    const q = await cached(`quote:${symbol}`, 10_000, () => fmpQuote(symbol));
    if (q) return NextResponse.json({ ...q, live: true });
  }
  // Demo tick: small random walk around the last close the client already has
  const bucket = Math.floor(Date.now() / 10_000);
  const r = seeded(`${symbol}:${bucket}`)();
  const price = base ? base * (1 + (r - 0.5) * 0.004) : 0;
  return NextResponse.json({ price, changePct: 0, time: Math.floor(Date.now() / 1000), live: false });
}
