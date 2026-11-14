"use client";
import { useState } from "react";
import type { AnalysisResult, StatementRow } from "@/server/types";
import { fmtBig, fmtNum } from "./format";

const SECTIONS: { key: string; label: string; rows: [keyof StatementRow, string][] }[] = [
  { key: "is", label: "งบกำไรขาดทุน", rows: [["revenue", "Revenue"], ["grossProfit", "Gross Profit"], ["operatingIncome", "Operating Income"], ["netIncome", "Net Income"], ["eps", "EPS (Diluted)"]] },
  { key: "bs", label: "งบดุล", rows: [["totalAssets", "Total Assets"], ["totalLiabilities", "Total Liabilities"], ["totalEquity", "Total Equity"], ["totalDebt", "Total Debt"], ["cash", "Cash & Equivalents"]] },
  { key: "cf", label: "งบกระแสเงินสด", rows: [["operatingCashFlow", "Operating Cash Flow"], ["capex", "CapEx"], ["freeCashFlow", "Free Cash Flow"], ["dividendsPaid", "Dividends Paid"]] },
];

export default function Financials({ r }: { r: AnalysisResult }) {
  const [tab, setTab] = useState("is");
  const sec = SECTIONS.find((s) => s.key === tab)!;
  const rows = r.statements;
  return (
    <div className="panel">
      <div className="panel-title">
        <span>Financial Statements · {r.profile.currency}</span>
        <div className="flex gap-1 normal-case tracking-normal">
          {SECTIONS.map((s) => (
            <button key={s.key} onClick={() => setTab(s.key)} className={`chip ${tab === s.key ? "border-accent text-white" : ""}`}>{s.label}</button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-4 pb-4 scroll-thin">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="py-2 text-left font-medium">รายการ</th>
              {rows.map((p) => <th key={p.period} className="text-right font-medium">{p.period}</th>)}
              <th className="text-right font-medium">YoY</th>
            </tr>
          </thead>
          <tbody>
            {sec.rows.map(([k, label]) => {
              const a = rows[0]?.[k] as number, b = rows[1]?.[k] as number;
              const yoy = b ? ((a - b) / Math.abs(b)) * 100 : NaN;
              return (
                <tr key={k} className="border-t border-ink-800 hover:bg-ink-800/50">
                  <td className="py-2 text-slate-300">{label}</td>
                  {rows.map((p) => <td key={p.period} className="num text-right text-slate-100">{k === "eps" ? fmtNum(p[k] as number) : fmtBig(p[k] as number)}</td>)}
                  <td className={`num text-right ${yoy > 0 ? "text-bull" : yoy < 0 ? "text-bear" : "text-slate-500"}`}>{Number.isFinite(yoy) ? `${yoy > 0 ? "+" : ""}${yoy.toFixed(1)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {r.estimates.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-slate-400">Consensus Estimates</div>
            <div className="flex flex-wrap gap-2">
              {r.estimates.map((e) => (
                <span key={e.period} className="chip"><b className="text-white">{e.period}</b> Rev {fmtBig(e.revenueAvg)} · EPS {fmtNum(e.epsAvg)} · {e.analysts} analysts</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
