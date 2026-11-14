import { NextResponse } from "next/server";
import { listAlerts } from "@/server/notify/store";
import { env } from "@/server/lib/env";
import { telegramEnabled } from "@/server/notify/telegram";
import { lineEnabled } from "@/server/notify/line";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const since = new URL(req.url).searchParams.get("since") || undefined;
  const alerts = await listAlerts(since);
  return NextResponse.json({
    alerts,
    threshold: env.alertThreshold,
    channels: { telegram: telegramEnabled(), line: lineEnabled(), inApp: true },
  });
}
