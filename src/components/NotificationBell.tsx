"use client";
import { useEffect, useRef, useState } from "react";
import type { AlertRecord } from "@/server/types";
import { ACTION_STYLE, fmtPct } from "./format";

type Meta = { threshold: number; channels: { telegram: boolean; line: boolean; inApp: boolean } };

export default function NotificationBell({ onOpen }: { onOpen: (symbol: string) => void }) {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const seen = useRef<Set<string>>(new Set());
  const first = useRef(true);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch("/api/alerts");
        const data = await res.json();
        const list: AlertRecord[] = data.alerts ?? [];
        setMeta({ threshold: data.threshold, channels: data.channels });
        const fresh = list.filter((a) => !seen.current.has(a.id));
        fresh.forEach((a) => seen.current.add(a.id));
        if (!first.current && fresh.length) {
          setUnread((u) => u + fresh.length);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            for (const a of fresh) {
              new Notification(`${a.action} ${a.symbol} · ${a.confidence}/100`, { body: `คาดการณ์ ${fmtPct(a.expectedReturnPct)} ภายใน ${a.horizonLabel}` });
            }
          }
        }
        first.current = false;
        setAlerts(list);
      } catch { /* offline */ }
    };
    poll();
    const id = setInterval(poll, 30_000);
    return () => clearInterval(id);
  }, []);

  const enablePush = async () => {
    if (typeof Notification !== "undefined") await Notification.requestPermission();
  };

  return (
    <div className="relative ml-auto sm:ml-0">
      <button onClick={() => { setOpen(!open); setUnread(0); }} className="relative rounded-lg border border-ink-600 bg-ink-800 p-2 hover:border-accent" aria-label="Notifications">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
        {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-bear px-1.5 text-[10px] font-bold">{unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] rounded-xl border border-ink-600 bg-ink-800 shadow-2xl">
          <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Smart Alerts</div>
              <div className="text-[11px] text-slate-400">แจ้งเตือนเมื่อ Confidence ≥ {meta?.threshold ?? 85}</div>
            </div>
            <button onClick={enablePush} className="chip hover:border-accent">เปิด Push</button>
          </div>
          <div className="flex gap-2 border-b border-ink-700 px-4 py-2 text-[11px]">
            <span className={meta?.channels.telegram ? "text-bull" : "text-slate-500"}>● Telegram</span>
            <span className={meta?.channels.line ? "text-bull" : "text-slate-500"}>● LINE</span>
            <span className="text-bull">● In-app</span>
          </div>
          <ul className="max-h-80 overflow-auto scroll-thin">
            {alerts.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">ยังไม่มีสัญญาณที่ผ่านเกณฑ์ — ระบบสแกนอัตโนมัติทุก 30 นาที</li>}
            {alerts.map((a) => (
              <li key={a.id}>
                <button onClick={() => { onOpen(a.symbol); setOpen(false); }} className="flex w-full items-center gap-3 border-b border-ink-700/60 px-4 py-2.5 text-left hover:bg-ink-700/50">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${ACTION_STYLE[a.action].cls}`}>{a.action}</span>
                  <div className="flex-1">
                    <div className="font-mono text-sm font-semibold">{a.symbol} <span className="text-slate-400">· {a.confidence}/100</span></div>
                    <div className="text-[11px] text-slate-400">{fmtPct(a.expectedReturnPct)} ภายใน {a.horizonLabel}</div>
                  </div>
                  <span className="text-[10px] text-slate-500">{new Date(a.createdAt).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
