import "server-only";
// ─── Agent D: Portfolio Manager (Chief Investment Officer brain) ───
// Receives the distilled outputs of Agents A, B, C plus the quant engine's
// decision, and writes the final catalysts / risks / investment thesis.
// Uses Claude via the official Anthropic SDK; falls back to a rule engine without a key.
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod/v4";
import { env } from "../lib/env";
import type { AgentReport, AnalysisResult, MacroSnapshot, NewsItem } from "../types";
import { clamp } from "../lib/math";

const BrainSchema = z.object({
  catalysts: z.array(z.string()).describe("3-6 positive catalysts, each one short sentence in Thai"),
  risks: z.array(z.string()).describe("3-6 key risks, each one short sentence in Thai"),
  thesis: z.string().describe("Investment thesis in Thai, 3-5 short paragraphs separated by blank lines"),
  confidenceAdjustment: z.number().describe("Integer between -10 and 10 to adjust the quant confidence"),
});

const SYSTEM = `You are the Portfolio Manager (CIO) of a global multi-strategy hedge fund.
Three analyst agents have sent you their reports: Macro (A), Fundamental (B), Technical Quant (C).
The quant engine has already produced a signal (BUY / SELL / CALL / PUT / HOLD), a confidence score and
a statistical return projection. Your job:
1. Extract the concrete catalysts and risks that matter for the price, grounded ONLY in the data supplied.
2. Write the investment thesis the way a PM writes an IC memo: the setup, why the signal makes sense
   (or where you disagree), position sizing / risk management (stop-loss, take-profit, horizon),
   and what would invalidate the thesis. For CALL/PUT explain why options suit this setup
   (defined risk, short horizon, momentum) and what strike/expiry style fits (e.g. slightly OTM, expiry beyond the horizon).
3. Set confidenceAdjustment (-10..10): negative if the data is contradictory, thin, or demo data; positive only if all evidence agrees.
Write everything in Thai (financial terms may stay in English). Do not invent numbers that are not in the input.
Never promise returns; refer to projections as statistical estimates.`;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic({ apiKey: env.anthropicKey, timeout: 60_000, maxRetries: 1 }));

export type PMInput = {
  symbol: string;
  name: string;
  sector: string;
  country: string;
  price: number;
  currency: string;
  agents: AgentReport[];
  macro: MacroSnapshot;
  news: NewsItem[];
  sentiment: AnalysisResult["sentiment"];
  decision: Omit<AnalysisResult["decision"], "forecasts"> & { forecasts: AnalysisResult["decision"]["forecasts"] };
  dataMode: AnalysisResult["dataMode"];
};

export async function runPortfolioManager(input: PMInput): Promise<{ brain: AnalysisResult["brain"]; confidence: number }> {
  if (!env.anthropicKey) return ruleBasedBrain(input);
  try {
    const payload = {
      ...input,
      news: input.news.slice(0, 12).map((n) => ({ t: n.title, s: n.sentiment, d: n.publishedAt })),
    };
    const res = await getClient().beta.messages.parse({
      model: env.anthropicModel,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(BrainSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: `Analyst package (JSON):\n${JSON.stringify(payload)}` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) return ruleBasedBrain(input);
    const out = res.parsed_output;
    return {
      confidence: clamp(Math.round(input.decision.confidence + clamp(out.confidenceAdjustment, -10, 10)), 1, 99),
      brain: { catalysts: out.catalysts.slice(0, 6), risks: out.risks.slice(0, 6), thesis: out.thesis, model: res.model },
    };
  } catch (err) {
    console.error("[Agent D] Claude call failed, using rule engine:", err instanceof Error ? err.message : err);
    return ruleBasedBrain(input);
  }
}

// ── Deterministic fallback "brain" (no LLM key) ──
function ruleBasedBrain(i: PMInput): { brain: AnalysisResult["brain"]; confidence: number } {
  const [A, B, C] = ["A_MACRO", "B_FUNDAMENTAL", "C_TECHNICAL"].map((k) => i.agents.find((a) => a.agent === k)!);
  const catalysts: string[] = [];
  const risks: string[] = [];
  for (const ag of [B, C, A]) {
    for (const h of ag.highlights) {
      // risk patterns are checked first so a line is never counted on both sides
      if (/ขาลง|Death|ลบ|หนี้สูง|หดตัว|Overbought|ตึงตัว|Inverted|กลัว|ตัดลง|ติดลบ|หลุด|เติบโต -/.test(h)) risks.push(h);
      else if (/ขาขึ้น|Golden|บวก|เติบโต [0-9]|ขยายตัว|Oversold|ผ่อนคลาย|เปิดรับ|ตัดขึ้น|Breakout/.test(h)) catalysts.push(h);
    }
  }
  const posNews = i.news.filter((n) => n.sentiment > 0.3).slice(0, 2).map((n) => `ข่าวบวก: ${n.title}`);
  const negNews = i.news.filter((n) => n.sentiment < -0.3).slice(0, 2).map((n) => `ข่าวลบ: ${n.title}`);
  catalysts.push(...posNews);
  risks.push(...negNews);
  if (!catalysts.length) catalysts.push("ยังไม่พบตัวเร่งเชิงบวกที่ชัดเจนจากข้อมูลล่าสุด");
  if (!risks.length) risks.push("ความผันผวนของตลาดโดยรวมยังเป็นความเสี่ยงหลัก");

  const d = { ...i.decision, confidence: i.dataMode === "demo" ? Math.max(1, i.decision.confidence - 5) : i.decision.confidence };
  const actionTh: Record<string, string> = { BUY: "ซื้อ (BUY)", SELL: "ขาย/ลดน้ำหนัก (SELL)", CALL: "Call Option", PUT: "Put Option", HOLD: "ถือ/รอดู (HOLD)" };
  const thesis = [
    `${i.name} (${i.symbol}) — สัญญาณ ${actionTh[d.action]} ความมั่นใจ ${d.confidence}/100. คะแนนจากสามสมองกล: Macro ${A.score}, Fundamental ${B.score}, Technical ${C.score}; อารมณ์ตลาดจากข่าว Bullish ${i.sentiment.bullishPct}%.`,
    d.action === "HOLD"
      ? `หลักฐานยังไม่สอดคล้องกันพอจะเปิดสถานะใหม่ ผู้จัดการกองทุนจะรอให้ราคาเลือกทางผ่านแนวรับ/แนวต้านสำคัญก่อน`
      : `กรอบเวลาที่ให้ Risk/Reward ดีที่สุดคือ ${d.horizonLabel} คาดการณ์ทางสถิติของผลตอบแทนส่วนต่างราคา ${d.expectedCapitalGainPct}%${d.expectedDividendYieldPct ? ` + ปันผล ${d.expectedDividendYieldPct}%` : ""} (คำนวณจาก Historical Volatility และ Sentiment ไม่ใช่การรับประกัน).`,
    `การบริหารความเสี่ยง: Stop-loss ${d.stopLoss} / Take-profit ${d.takeProfit} ${i.currency} (อิง ATR 2:3). ขนาดสถานะไม่ควรเกิน 2-5% ของพอร์ต${d.action === "CALL" || d.action === "PUT" ? " และสำหรับออปชันควรเลือกวันหมดอายุยาวกว่ากรอบเวลาคาดการณ์อย่างน้อย 2 เท่า เพื่อลดผลกระทบ Time decay" : ""}.`,
    `เงื่อนไขที่ทำให้ Thesis ผิด: ราคาปิดทะลุระดับ Stop-loss, ข่าวลบระดับโครงสร้าง หรือภาวะมหภาคเปลี่ยนเป็น Risk-off.`,
    i.dataMode !== "live" ? `หมายเหตุ: บางส่วนเป็นข้อมูลตัวอย่าง (DEMO) — ใส่ API key เพื่อใช้ข้อมูลจริง และใส่ ANTHROPIC_API_KEY เพื่อเปิดใช้สมองกล Claude.` : "",
  ].filter(Boolean).join("\n\n");

  return {
    confidence: d.confidence,
    brain: { catalysts: catalysts.slice(0, 6), risks: risks.slice(0, 6), thesis, model: "rule-engine" },
  };
}
