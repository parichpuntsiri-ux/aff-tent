// Display-only formatting helpers (no analytics logic on the client).
export const fmtNum = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

export const fmtBig = (v: number | null | undefined) => {
  if (v == null || !Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  const s = v < 0 ? "-" : "";
  if (a >= 1e12) return `${s}${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${s}${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${s}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${s}${(a / 1e3).toFixed(1)}K`;
  return `${s}${a.toFixed(2)}`;
};

export const fmtPct = (v: number | null | undefined, d = 2) =>
  v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(d)}%`;

export const toneClass = (v: number) => (v > 0 ? "text-bull" : v < 0 ? "text-bear" : "text-slate-300");

export const ACTION_STYLE: Record<string, { label: string; th: string; cls: string }> = {
  BUY: { label: "BUY", th: "ซื้อ", cls: "bg-bull/15 text-bull border-bull/40" },
  SELL: { label: "SELL", th: "ขาย", cls: "bg-bear/15 text-bear border-bear/40" },
  CALL: { label: "CALL", th: "ซื้อ Call Option", cls: "bg-emerald-400/15 text-emerald-300 border-emerald-400/40" },
  PUT: { label: "PUT", th: "ซื้อ Put Option", cls: "bg-rose-400/15 text-rose-300 border-rose-400/40" },
  HOLD: { label: "HOLD", th: "ถือ / รอดู", cls: "bg-slate-400/10 text-slate-300 border-slate-400/30" },
};
