import { NextResponse } from "next/server";
import { analyze } from "@/server/agents/orchestrator";
import { clientIp, rateLimit } from "@/server/lib/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: { symbol: string } }) {
  if (!rateLimit(clientIp(req) + ":analyze", 20)) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const symbol = decodeURIComponent(params.symbol).toUpperCase();
  if (!/^[A-Z0-9.\-^]{1,15}$/.test(symbol)) return NextResponse.json({ error: "invalid_symbol" }, { status: 400 });
  try {
    const result = await analyze(symbol);
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (e) {
    console.error("[analyze]", symbol, e);
    return NextResponse.json({ error: "analysis_failed" }, { status: 500 });
  }
}
