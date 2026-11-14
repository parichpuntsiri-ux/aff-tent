import "server-only";
import { env } from "../lib/env";
import { getJson } from "../lib/http";

type Obs = { observations?: { date: string; value: string }[] };

export const fredEnabled = () => Boolean(env.fredKey);

/** Latest N numeric observations (newest first). */
export async function fredSeries(seriesId: string, limit = 14): Promise<number[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${env.fredKey}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await getJson<Obs>(url);
  return (data?.observations ?? []).map((o) => parseFloat(o.value)).filter((v) => Number.isFinite(v));
}
