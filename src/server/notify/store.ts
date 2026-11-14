import "server-only";
import { env } from "../lib/env";
import type { AlertRecord } from "../types";

// In-memory ring buffer (always on) + Supabase table `alerts` (when configured).
const memory: AlertRecord[] = [];
const supabaseOn = () => Boolean(env.supabaseUrl && env.supabaseKey);
const sbHeaders = () => ({
  apikey: env.supabaseKey,
  Authorization: `Bearer ${env.supabaseKey}`,
  "Content-Type": "application/json",
});

export async function saveAlert(a: AlertRecord) {
  memory.unshift(a);
  memory.splice(100);
  if (!supabaseOn()) return;
  try {
    await fetch(`${env.supabaseUrl}/rest/v1/alerts`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({
        id: a.id, symbol: a.symbol, name: a.name, action: a.action, confidence: a.confidence,
        expected_return_pct: a.expectedReturnPct, horizon_label: a.horizonLabel, created_at: a.createdAt,
      }),
    });
  } catch (e) {
    console.error("[alerts] supabase insert failed", e);
  }
}

export async function listAlerts(since?: string): Promise<AlertRecord[]> {
  if (supabaseOn()) {
    try {
      const filter = since ? `&created_at=gt.${encodeURIComponent(since)}` : "";
      const res = await fetch(`${env.supabaseUrl}/rest/v1/alerts?select=*&order=created_at.desc&limit=50${filter}`, { headers: sbHeaders(), cache: "no-store" });
      if (res.ok) {
        const rows = (await res.json()) as Record<string, unknown>[];
        return rows.map((r) => ({
          id: String(r.id), symbol: String(r.symbol), name: String(r.name), action: r.action as AlertRecord["action"],
          confidence: Number(r.confidence), expectedReturnPct: Number(r.expected_return_pct),
          horizonLabel: String(r.horizon_label), createdAt: String(r.created_at),
        }));
      }
    } catch { /* fall through to memory */ }
  }
  return since ? memory.filter((m) => m.createdAt > since) : memory;
}

/** Avoid re-alerting the same symbol+action within 12h. */
export async function recentlyAlerted(symbol: string, action: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - 12 * 3600_000).toISOString();
  return (await listAlerts(cutoff)).some((a) => a.symbol === symbol && a.action === action);
}
