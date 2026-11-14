import "server-only";

// Central, server-only access to secrets. Importing this from a client
// component fails the build ("server-only"), so keys can never leak.
export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  fmpKey: process.env.FMP_API_KEY || "",
  fredKey: process.env.FRED_API_KEY || "",
  perigonKey: process.env.PERIGON_API_KEY || "",
  alertThreshold: Number(process.env.ALERT_THRESHOLD || 85),
  scanUniverse: (process.env.SCAN_UNIVERSE ||
    "AAPL,MSFT,NVDA,AMZN,GOOGL,META,TSLA,AMD,PTT.BK,AOT.BK,CPALL.BK,7203.T,ASML,TSM")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID || "",
  lineToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  lineTo: process.env.LINE_TARGET_USER_ID || "",
  cronSecret: process.env.CRON_SECRET || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};
