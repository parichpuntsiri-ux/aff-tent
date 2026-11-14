// Shared types. These describe the *results* that leave the server.
// No formulas or weights live here — only output shapes.

export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type SearchResult = {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  currency?: string;
};

export type CompanyProfile = {
  symbol: string;
  name: string;
  country: string;
  exchange: string;
  currency: string;
  sector: string;
  industry: string;
  description: string;
  website?: string;
  ceo?: string;
  employees?: number;
  marketCap?: number;
  price: number;
  changePct: number;
  beta?: number;
  image?: string;
};

export type StatementRow = {
  period: string; // e.g. "FY2025"
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalDebt: number;
  cash: number;
  operatingCashFlow: number;
  freeCashFlow: number;
  capex: number;
  dividendsPaid: number;
};

export type NewsItem = {
  title: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: number; // -1..1
};

export type MacroSnapshot = {
  fedFunds: number | null;
  us10y: number | null;
  us2y: number | null;
  cpiYoY: number | null;
  unemployment: number | null;
  vix: number | null;
  regime: "EASING" | "TIGHTENING" | "NEUTRAL";
  riskAppetite: "RISK_ON" | "RISK_OFF" | "MIXED";
  notes: string[];
};

export type SignalAction = "BUY" | "SELL" | "CALL" | "PUT" | "HOLD";

export type ForecastHorizon = {
  label: string; // "24 ชั่วโมง", "5 วัน", ...
  hours: number;
  expectedReturnPct: number;
  rangeLowPct: number; // ~25th percentile
  rangeHighPct: number; // ~75th percentile
  probabilityOfProfit: number; // 0..100
};

export type AgentReport = {
  agent: "A_MACRO" | "B_FUNDAMENTAL" | "C_TECHNICAL";
  title: string;
  score: number; // 0..100, 50 = neutral
  highlights: string[];
  dataSource: "live" | "demo";
};

export type LevelLine = { price: number; kind: "support" | "resistance"; strength: number };

export type ChartPayload = {
  candles: Candle[];
  overlays: {
    ema20: { time: number; value: number }[];
    ema50: { time: number; value: number }[];
    bbUpper: { time: number; value: number }[];
    bbLower: { time: number; value: number }[];
  };
  rsi: { time: number; value: number }[];
  macd: { time: number; macd: number; signal: number; hist: number }[];
  levels: LevelLine[];
  markers: { time: number; position: "aboveBar" | "belowBar"; text: string; color: string }[];
};

export type AnalysisResult = {
  symbol: string;
  generatedAt: string;
  profile: CompanyProfile;
  chart: ChartPayload;
  statements: StatementRow[];
  dividend: { yieldPct: number; lastPayment?: string; nextExDate?: string; frequency?: string };
  estimates: { period: string; revenueAvg: number; epsAvg: number; analysts: number }[];
  news: NewsItem[];
  macro: MacroSnapshot;
  agents: AgentReport[];
  sentiment: { bullishPct: number; bearishPct: number; articles: number };
  decision: {
    action: SignalAction;
    confidence: number; // 1..100
    horizonLabel: string;
    expectedCapitalGainPct: number;
    expectedDividendYieldPct: number;
    expectedTotalReturnPct: number;
    stopLoss: number;
    takeProfit: number;
    forecasts: ForecastHorizon[];
  };
  brain: {
    catalysts: string[];
    risks: string[];
    thesis: string;
    model: string; // "claude-opus-5-5" or "rule-engine"
  };
  dataMode: "live" | "demo" | "mixed";
  disclaimer: string;
};

export type AlertRecord = {
  id: string;
  symbol: string;
  name: string;
  action: SignalAction;
  confidence: number;
  expectedReturnPct: number;
  horizonLabel: string;
  createdAt: string;
};
