import "server-only";

// Built-in global universe used for search when FMP isn't configured,
// and as the default scan list. [symbol, name, exchange, country, currency, sector, industry, basePrice]
export const UNIVERSE: [string, string, string, string, string, string, string, number][] = [
  ["AAPL", "Apple Inc.", "NASDAQ", "United States", "USD", "Technology", "Consumer Electronics", 228],
  ["MSFT", "Microsoft Corporation", "NASDAQ", "United States", "USD", "Technology", "Software—Infrastructure", 425],
  ["NVDA", "NVIDIA Corporation", "NASDAQ", "United States", "USD", "Technology", "Semiconductors", 140],
  ["AMZN", "Amazon.com, Inc.", "NASDAQ", "United States", "USD", "Consumer Cyclical", "Internet Retail", 205],
  ["GOOGL", "Alphabet Inc.", "NASDAQ", "United States", "USD", "Communication Services", "Internet Content & Information", 178],
  ["META", "Meta Platforms, Inc.", "NASDAQ", "United States", "USD", "Communication Services", "Internet Content & Information", 580],
  ["TSLA", "Tesla, Inc.", "NASDAQ", "United States", "USD", "Consumer Cyclical", "Auto Manufacturers", 320],
  ["AMD", "Advanced Micro Devices, Inc.", "NASDAQ", "United States", "USD", "Technology", "Semiconductors", 150],
  ["AVGO", "Broadcom Inc.", "NASDAQ", "United States", "USD", "Technology", "Semiconductors", 175],
  ["JPM", "JPMorgan Chase & Co.", "NYSE", "United States", "USD", "Financial Services", "Banks—Diversified", 235],
  ["V", "Visa Inc.", "NYSE", "United States", "USD", "Financial Services", "Credit Services", 300],
  ["KO", "The Coca-Cola Company", "NYSE", "United States", "USD", "Consumer Defensive", "Beverages—Non-Alcoholic", 68],
  ["JNJ", "Johnson & Johnson", "NYSE", "United States", "USD", "Healthcare", "Drug Manufacturers", 158],
  ["XOM", "Exxon Mobil Corporation", "NYSE", "United States", "USD", "Energy", "Oil & Gas Integrated", 118],
  ["PTT.BK", "PTT Public Company Limited", "SET", "Thailand", "THB", "Energy", "Oil & Gas Integrated", 33],
  ["AOT.BK", "Airports of Thailand PCL", "SET", "Thailand", "THB", "Industrials", "Airports & Air Services", 60],
  ["CPALL.BK", "CP ALL Public Company Limited", "SET", "Thailand", "THB", "Consumer Defensive", "Grocery Stores", 58],
  ["ADVANC.BK", "Advanced Info Service PCL", "SET", "Thailand", "THB", "Communication Services", "Telecom Services", 290],
  ["KBANK.BK", "Kasikornbank PCL", "SET", "Thailand", "THB", "Financial Services", "Banks—Regional", 155],
  ["SCB.BK", "SCB X Public Company Limited", "SET", "Thailand", "THB", "Financial Services", "Banks—Regional", 120],
  ["DELTA.BK", "Delta Electronics (Thailand) PCL", "SET", "Thailand", "THB", "Technology", "Electronic Components", 150],
  ["GULF.BK", "Gulf Energy Development PCL", "SET", "Thailand", "THB", "Utilities", "Utilities—Independent Power Producers", 58],
  ["BDMS.BK", "Bangkok Dusit Medical Services", "SET", "Thailand", "THB", "Healthcare", "Medical Care Facilities", 27],
  ["7203.T", "Toyota Motor Corporation", "TSE", "Japan", "JPY", "Consumer Cyclical", "Auto Manufacturers", 2700],
  ["6758.T", "Sony Group Corporation", "TSE", "Japan", "JPY", "Technology", "Consumer Electronics", 3300],
  ["TSM", "Taiwan Semiconductor Manufacturing", "NYSE", "Taiwan", "USD", "Technology", "Semiconductors", 195],
  ["ASML", "ASML Holding N.V.", "NASDAQ", "Netherlands", "USD", "Technology", "Semiconductor Equipment", 720],
  ["NVO", "Novo Nordisk A/S", "NYSE", "Denmark", "USD", "Healthcare", "Biotechnology", 105],
  ["SAP", "SAP SE", "NYSE", "Germany", "USD", "Technology", "Software—Application", 235],
  ["BABA", "Alibaba Group Holding Limited", "NYSE", "China", "USD", "Consumer Cyclical", "Internet Retail", 95],
  ["0700.HK", "Tencent Holdings Limited", "HKSE", "China", "HKD", "Communication Services", "Internet Content & Information", 410],
  ["005930.KS", "Samsung Electronics Co., Ltd.", "KRX", "South Korea", "KRW", "Technology", "Consumer Electronics", 58000],
  ["SHEL", "Shell plc", "NYSE", "United Kingdom", "USD", "Energy", "Oil & Gas Integrated", 66],
  ["MC.PA", "LVMH Moët Hennessy Louis Vuitton", "EURONEXT", "France", "EUR", "Consumer Cyclical", "Luxury Goods", 640],
];

export function universeLookup(symbol: string) {
  return UNIVERSE.find((u) => u[0] === symbol.toUpperCase());
}

export function countryFromSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s.endsWith(".BK")) return "Thailand";
  if (s.endsWith(".T")) return "Japan";
  if (s.endsWith(".HK")) return "China";
  if (s.endsWith(".KS") || s.endsWith(".KQ")) return "South Korea";
  if (s.endsWith(".L")) return "United Kingdom";
  if (s.endsWith(".PA")) return "France";
  if (s.endsWith(".DE")) return "Germany";
  if (s.endsWith(".SI")) return "Singapore";
  return "United States";
}
