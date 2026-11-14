"use client";
import type { AnalysisResult } from "@/server/types";
import { ACTION_STYLE, fmtNum, fmtPct, toneClass } from "./format";

export function SignalCard({ r }: { r: AnalysisResult }) {
  const d = r.decision;
  const st = ACTION_STYLE[d.action];
  const ring = 2 * Math.PI * 42;
  const color = d.action === "BUY" || d.action === "CALL" ? "#16c784" : d.action === "SELL" || d.action === "PUT" ? "#ea3943" : "#94a3b8";
  return (
    <div className="panel">
      <div className="panel-title"><span>Agent D · Portfolio Manager Signal</span><span className="chip normal-case tracking-normal">{r.brain.model}</span></div>
      <div className="flex flex-wrap items-center gap-5 px-4 pb-4">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#1a2540" strokeWidth="9" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={ring} strokeDashoffset={ring * (1 - d.confidence / 100)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="num text-3xl font-bold text-white">{d.confidence}</span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Confidence</span>
          </div>
        </div>
        <div className="min-w-[200px] flex-1 space-y-2">
          <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-lg font-bold ${st.cls}`}>
            {st.label} <span className="text-sm font-medium opacity-80">· {st.th}</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-400">กรอบเวลา</span><span className="num text-white">{d.horizonLabel}</span>
            <span className="text-slate-400">Capital Gain</span><span className={`num ${toneClass(d.expectedCapitalGainPct)}`}>{fmtPct(d.expectedCapitalGainPct)}</span>
            <span className="text-slate-400">Dividend Yield</span><span className="num text-gold">{fmtPct(d.expectedDividendYieldPct)}</span>
            <span className="text-slate-400">Total Return</span><span className={`num font-semibold ${toneClass(d.expectedTotalReturnPct)}`}>{fmtPct(d.expectedTotalReturnPct)}</span>
            <span className="text-slate-400">Stop-loss / Target</span><span className="num text-slate-200">{fmtNum(d.stopLoss)} / {fmtNum(d.takeProfit)}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-ink-700 px-4 py-3">
        <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">Predictive ROI & Timeframe (Historical Volatility × Sentiment)</div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-xs">
            <thead className="text-slate-500"><tr><th className="py-1 text-left font-medium">กรอบเวลา</th><th className="text-right font-medium">คาดการณ์</th><th className="text-right font-medium">ช่วง 50%</th><th className="text-right font-medium">P(กำไร Long)</th></tr></thead>
            <tbody>
              {d.forecasts.map((f) => (
                <tr key={f.label} className={`border-t border-ink-800 ${f.label === d.horizonLabel ? "bg-accent/10" : ""}`}>
                  <td className="py-1.5 text-slate-300">{f.label}</td>
                  <td className={`num text-right ${toneClass(f.expectedReturnPct)}`}>{fmtPct(f.expectedReturnPct)}</td>
                  <td className="num text-right text-slate-400">{fmtPct(f.rangeLowPct, 1)} … {fmtPct(f.rangeHighPct, 1)}</td>
                  <td className="num text-right text-slate-200">{fmtNum(f.probabilityOfProfit, 1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function SentimentMeter({ r }: { r: AnalysisResult }) {
  const { bullishPct, bearishPct, articles } = r.sentiment;
  const mood = bullishPct >= 65 ? "Strong Bullish" : bullishPct >= 55 ? "Bullish" : bullishPct <= 35 ? "Strong Bearish" : bullishPct <= 45 ? "Bearish" : "Neutral";
  return (
    <div className="panel">
      <div className="panel-title"><span>Market Sentiment Meter</span><span className="normal-case tracking-normal text-slate-500">{articles} ข่าวล่าสุด</span></div>
      <div className="px-4 pb-4">
        <div className="mb-2 flex items-end justify-between">
          <div><div className="num text-2xl font-bold text-bull">{bullishPct}%</div><div className="text-[11px] text-slate-400">Bullish</div></div>
          <div className="text-sm font-semibold text-white">{mood}</div>
          <div className="text-right"><div className="num text-2xl font-bold text-bear">{bearishPct}%</div><div className="text-[11px] text-slate-400">Bearish</div></div>
        </div>
        <div className="relative h-3 overflow-hidden rounded-full bg-bear/70">
          <div className="h-full rounded-l-full bg-bull transition-all duration-700" style={{ width: `${bullishPct}%` }} />
          <div className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: "50%" }} />
        </div>
      </div>
    </div>
  );
}

export function CatalystsRisks({ r }: { r: AnalysisResult }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="panel">
        <div className="panel-title"><span className="text-bull">▲ Catalysts · ปัจจัยบวก</span></div>
        <ul className="space-y-2 px-4 pb-4 text-sm">
          {r.brain.catalysts.map((c, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bull" /><span className="text-slate-200">{c}</span></li>)}
        </ul>
      </div>
      <div className="panel">
        <div className="panel-title"><span className="text-bear">▼ Risks · ปัจจัยลบ</span></div>
        <ul className="space-y-2 px-4 pb-4 text-sm">
          {r.brain.risks.map((c, i) => <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bear" /><span className="text-slate-200">{c}</span></li>)}
        </ul>
      </div>
    </div>
  );
}

export function ThesisBox({ r }: { r: AnalysisResult }) {
  return (
    <div className="panel">
      <div className="panel-title"><span>AI Investment Thesis</span><span className="chip normal-case tracking-normal">🧠 {r.brain.model}</span></div>
      <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-slate-200">
        {r.brain.thesis.split(/\n\s*\n/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
    </div>
  );
}

export function AgentsGrid({ r }: { r: AnalysisResult }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {r.agents.map((a) => (
        <div key={a.agent} className="panel">
          <div className="panel-title">
            <span>{a.title}</span>
            <span className={`chip normal-case tracking-normal ${a.dataSource === "live" ? "text-bull" : "text-gold"}`}>{a.dataSource.toUpperCase()}</span>
          </div>
          <div className="px-4 pb-4">
            <div className="mb-2 flex items-center gap-3">
              <span className="num text-2xl font-bold text-white">{a.score}</span>
              <div className="h-1.5 flex-1 rounded-full bg-ink-700">
                <div className={`h-full rounded-full ${a.score >= 55 ? "bg-bull" : a.score <= 45 ? "bg-bear" : "bg-slate-400"}`} style={{ width: `${a.score}%` }} />
              </div>
            </div>
            <ul className="space-y-1 text-xs text-slate-300">
              {a.highlights.map((h, i) => <li key={i}>• {h}</li>)}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
