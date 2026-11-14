"use client";
import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { AnalysisResult } from "@/server/types";
import SearchBar from "./SearchBar";
import NotificationBell from "./NotificationBell";
import Financials from "./Financials";
import { AgentsGrid, CatalystsRisks, SentimentMeter, SignalCard, ThesisBox } from "./BrainPanels";
import { fmtBig, fmtNum, fmtPct, toneClass } from "./format";

const PriceChart = dynamic(() => import("./PriceChart"), { ssr: false, loading: () => <div className="panel h-[680px] animate-pulse" /> });

const QUICK = ["NVDA", "AAPL", "TSLA", "PTT.BK", "AOT.BK", "CPALL.BK", "7203.T", "TSM"];
const STEPS = ["Agent A · Macro", "Agent B · Fundamental", "Agent C · Technical", "Agent D · Portfolio Manager"];

export default function Dashboard() {
  const [symbol, setSymbol] = useState<string>("");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const load = useCallback(async (sym: string) => {
    setSymbol(sym);
    setLoading(true);
    setError("");
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 900);
    try {
      const res = await fetch(`/api/analyze/${encodeURIComponent(sym)}`);
      if (!res.ok) throw new Error(res.status === 429 ? "เรียกใช้งานถี่เกินไป กรุณารอสักครู่" : "ไม่สามารถวิเคราะห์หุ้นนี้ได้");
      setData(await res.json());
      if (typeof window !== "undefined") window.history.replaceState(null, "", `?s=${encodeURIComponent(sym)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      clearInterval(timer);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("s");
    load(s || "NVDA");
  }, [load]);

  const p = data?.profile;

  return (
    <div className="mx-auto max-w-[1600px] overflow-x-clip px-4 pb-10">
      {/* Top bar */}
      <header className="sticky top-0 z-40 -mx-4 mb-4 flex flex-wrap items-center gap-3 border-b border-ink-700 bg-ink-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-bull text-sm font-black">A1</div>
          <div className="leading-tight">
            <div className="text-sm font-bold">All in One Investor</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Multi-Agent Quant</div>
          </div>
        </div>
        <div className="order-3 min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1"><SearchBar onSelect={load} /></div>
        <NotificationBell onOpen={load} />
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button key={q} onClick={() => load(q)} className={`chip hover:border-accent ${q === symbol ? "border-accent text-white" : ""}`}>{q}</button>
        ))}
      </div>

      {loading && (
        <div className="panel mb-4 px-4 py-3">
          <div className="mb-2 text-sm text-slate-300">กำลังวิเคราะห์ <b className="font-mono text-white">{symbol}</b> ด้วยสมองกล 4 ตัว…</div>
          <div className="grid gap-2 sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s} className={`rounded-lg border px-3 py-2 text-xs ${i < step ? "border-bull/40 text-bull" : i === step ? "animate-pulse border-accent text-white" : "border-ink-700 text-slate-500"}`}>
                {i < step ? "✓ " : ""}{s}
              </div>
            ))}
          </div>
        </div>
      )}
      {error && <div className="panel mb-4 border-bear/50 px-4 py-3 text-sm text-bear">{error}</div>}

      {data && p && (
        <div className={`space-y-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
          {data.dataMode !== "live" && (
            <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-xs text-gold">
              โหมด {data.dataMode === "demo" ? "DEMO" : "MIXED"}: บางแหล่งข้อมูลยังไม่ได้ใส่ API key จึงใช้ข้อมูลจำลอง — ดูวิธีตั้งค่าใน README
            </div>
          )}

          {/* Company header */}
          <section className="panel px-4 py-4">
            <div className="flex flex-wrap items-start gap-4">
              {p.image && <img src={p.image} alt="" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />}
              <div className="min-w-[240px] flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="text-2xl font-bold">{p.name}</h1>
                  <span className="font-mono text-slate-400">{p.symbol}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className="chip">🌍 {p.country}</span>
                  <span className="chip">🏛 {p.exchange}</span>
                  <span className="chip">🏷 {p.sector}</span>
                  <span className="chip">⚙️ {p.industry}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="num text-3xl font-bold">{fmtNum(p.price)} <span className="text-sm text-slate-400">{p.currency}</span></div>
                <div className={`num text-sm ${toneClass(p.changePct)}`}>{fmtPct(p.changePct)} วันนี้</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Market Cap", fmtBig(p.marketCap)],
                ["Beta", fmtNum(p.beta)],
                ["Dividend Yield", `${fmtNum(data.dividend.yieldPct)}%`],
                ["Last Dividend", data.dividend.lastPayment ?? "—"],
                ["CEO", p.ceo ?? "—"],
                ["Employees", p.employees ? p.employees.toLocaleString() : "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-ink-800/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">{k}</div>
                  <div className="num truncate text-slate-100">{v}</div>
                </div>
              ))}
            </div>
            <details className="mt-3 text-sm text-slate-400">
              <summary className="cursor-pointer text-slate-300">โปรไฟล์บริษัท</summary>
              <p className="mt-2 leading-relaxed">{p.description}</p>
              {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="mt-1 inline-block text-accent">{p.website}</a>}
            </details>
          </section>

          {/* Main grid */}
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0 space-y-4">
              <PriceChart symbol={data.symbol} data={data.chart} currency={p.currency} />
              <Financials r={data} />
            </div>
            <aside className="min-w-0 space-y-4">
              <SignalCard r={data} />
              <SentimentMeter r={data} />
              <div className="panel">
                <div className="panel-title"><span>Macro Snapshot</span><span className="chip normal-case tracking-normal">{data.macro.regime} · {data.macro.riskAppetite}</span></div>
                <div className="grid grid-cols-3 gap-2 px-4 pb-4 text-center text-xs">
                  {[["Fed Funds", data.macro.fedFunds], ["US10Y", data.macro.us10y], ["US2Y", data.macro.us2y], ["CPI YoY", data.macro.cpiYoY], ["Unemp.", data.macro.unemployment], ["VIX", data.macro.vix]].map(([k, v]) => (
                    <div key={k as string} className="rounded-lg bg-ink-800/70 py-2">
                      <div className="text-[10px] text-slate-500">{k}</div>
                      <div className="num text-sm text-white">{v == null ? "—" : fmtNum(v as number)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <CatalystsRisks r={data} />
          <ThesisBox r={data} />
          <AgentsGrid r={data} />

          <div className="panel">
            <div className="panel-title"><span>Breaking News Feed</span></div>
            <ul className="divide-y divide-ink-800 px-4 pb-2 text-sm">
              {data.news.slice(0, 12).map((n, i) => (
                <li key={i} className="flex items-center gap-3 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${n.sentiment > 0.15 ? "bg-bull" : n.sentiment < -0.15 ? "bg-bear" : "bg-slate-500"}`} />
                  <a href={n.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-slate-200 hover:text-white">{n.title}</a>
                  <span className="hidden text-[11px] text-slate-500 sm:inline">{n.source}</span>
                  <span className="text-[11px] text-slate-500">{new Date(n.publishedAt).toLocaleDateString("th-TH")}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-center text-[11px] leading-relaxed text-slate-500">{data.disclaimer}<br />อัปเดต {new Date(data.generatedAt).toLocaleString("th-TH")}</p>
        </div>
      )}
    </div>
  );
}
