import "server-only";
import { randomUUID } from "crypto";
import { env } from "./lib/env";
import { analyze } from "./agents/orchestrator";
import { formatAlert } from "./notify/format";
import { sendTelegram } from "./notify/telegram";
import { sendLine } from "./notify/line";
import { recentlyAlerted, saveAlert } from "./notify/store";
import type { AlertRecord } from "./types";

/** Scan the configured universe and fire alerts for confidence above threshold. */
export async function scanUniverse(threshold = env.alertThreshold) {
  const results: { symbol: string; action: string; confidence: number; alerted: boolean }[] = [];
  const queue = [...env.scanUniverse];
  const worker = async () => {
    while (queue.length) {
      const symbol = queue.shift()!;
      try {
        const r = await analyze(symbol);
        const d = r.decision;
        let alerted = false;
        if (d.action !== "HOLD" && d.confidence >= threshold && !(await recentlyAlerted(symbol, d.action))) {
          const alert: AlertRecord = {
            id: randomUUID(), symbol, name: r.profile.name, action: d.action, confidence: d.confidence,
            expectedReturnPct: d.expectedTotalReturnPct, horizonLabel: d.horizonLabel, createdAt: new Date().toISOString(),
          };
          await saveAlert(alert);
          const text = formatAlert(alert);
          await Promise.all([sendTelegram(text), sendLine(text)]);
          alerted = true;
        }
        results.push({ symbol, action: d.action, confidence: d.confidence, alerted });
      } catch (e) {
        console.error("[scan]", symbol, e);
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]); // 3 concurrent analyses
  return results.sort((a, b) => b.confidence - a.confidence);
}
