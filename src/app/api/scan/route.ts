import { NextResponse } from "next/server";
import { env } from "@/server/lib/env";
import { scanUniverse } from "@/server/scanner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Called by Vercel Cron (see vercel.json) or any scheduler with:
//   Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!env.cronSecret || auth !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await scanUniverse();
  return NextResponse.json({ scanned: results.length, alerts: results.filter((r) => r.alerted).length, results });
}
