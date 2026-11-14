import "server-only";
import type { AlertRecord } from "../types";

const EMOJI: Record<string, string> = { BUY: "🟢", SELL: "🔴", CALL: "🚀", PUT: "🧨", HOLD: "⚪" };

export function formatAlert(a: AlertRecord): string {
  return [
    `${EMOJI[a.action] ?? "📈"} All in One Investor — สัญญาณความมั่นใจสูง`,
    `หุ้น: ${a.symbol} (${a.name})`,
    `Action: ${a.action}`,
    `Confidence Score: ${a.confidence}/100`,
    `คาดการณ์ผลตอบแทน: ${a.expectedReturnPct >= 0 ? "+" : ""}${a.expectedReturnPct}%`,
    `กรอบเวลา: ${a.horizonLabel}`,
    `⚠️ ค่าคาดการณ์ทางสถิติ ไม่ใช่คำแนะนำการลงทุน`,
  ].join("\n");
}
