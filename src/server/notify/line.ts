import "server-only";
import { env } from "../lib/env";

// LINE Notify was discontinued on 31 March 2025, so this uses the
// LINE Messaging API push endpoint (works with a free LINE Official Account).
export const lineEnabled = () => Boolean(env.lineToken && env.lineTo);

export async function sendLine(text: string): Promise<boolean> {
  if (!lineEnabled()) return false;
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.lineToken}` },
      body: JSON.stringify({ to: env.lineTo, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
