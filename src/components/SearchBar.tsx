"use client";
import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/server/types";

const FLAGS: Record<string, string> = {
  "United States": "🇺🇸", Thailand: "🇹🇭", Japan: "🇯🇵", China: "🇨🇳", "South Korea": "🇰🇷", Taiwan: "🇹🇼",
  Netherlands: "🇳🇱", Denmark: "🇩🇰", Germany: "🇩🇪", France: "🇫🇷", "United Kingdom": "🇬🇧", Singapore: "🇸🇬",
};

export default function SearchBar({ onSelect }: { onSelect: (symbol: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setResults(data.results ?? []);
        setActive(0);
        setOpen(true);
      } catch { /* aborted */ }
    }, 180);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "/" && document.activeElement !== inputRef.current) { e.preventDefault(); inputRef.current?.focus(); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, []);

  const choose = (s: string) => { onSelect(s); setQ(""); setOpen(false); inputRef.current?.blur(); };

  return (
    <div ref={boxRef} className="relative w-full max-w-2xl">
      <div className="flex items-center gap-2 rounded-xl border border-ink-600 bg-ink-800 px-3 py-2 focus-within:border-accent">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") { const r = results[active]; if (r) choose(r.symbol); else if (q.trim()) choose(q.trim().toUpperCase()); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="ค้นหาหุ้นทั่วโลก: AAPL, NVDA, PTT.BK, Toyota, Tencent…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          aria-label="Search stocks"
        />
        <kbd className="hidden rounded border border-ink-600 px-1.5 text-[10px] text-slate-500 sm:block">/</kbd>
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-96 w-full overflow-auto rounded-xl border border-ink-600 bg-ink-800 py-1 shadow-2xl scroll-thin">
          {results.map((r, i) => (
            <li key={r.symbol}>
              <button
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(r.symbol)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${i === active ? "bg-ink-700" : ""}`}
              >
                <span className="text-base">{FLAGS[r.country] ?? "🌐"}</span>
                <span className="w-24 shrink-0 font-mono font-semibold text-white">{r.symbol}</span>
                <span className="flex-1 truncate text-slate-300">{r.name}</span>
                <span className="text-[11px] text-slate-500">{r.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
