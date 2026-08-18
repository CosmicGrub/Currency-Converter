import { dbGet, dbSet } from "./db.js";
import type { HistoryPoint } from "../types/index.js";

// ---------------------------------------------------------------------------
// Historical rate series for the trend chart. open.er-api.com only serves
// the latest snapshot, so history comes from a second, purpose-built
// free/no-key source: frankfurter.dev (ECB reference rates, formerly hosted
// at frankfurter.app -- that domain now 301s here without CORS headers, so
// this exact host is required). It covers a smaller currency set (~30, all
// major) than open.er-api's ~160 -- callers should treat "unsupported pair"
// as an expected, non-error outcome.
//
// Every successful fetch is cached (IndexedDB "history_cache" store, with
// localStorage/memory fallback -- see ./db.ts) keyed by base/target/window,
// so a later offline load can still render the last-known trend instead of
// the "unavailable" placeholder.
// ---------------------------------------------------------------------------
const HISTORY_ENDPOINT = "https://api.frankfurter.dev/v1";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function cacheKey(base: string, target: string, days: number): string {
  return `history:${base}:${target}:${days}d`;
}

interface FrankfurterResponse {
  rates?: Record<string, Record<string, number>>;
}

export interface FetchHistoryOptions {
  days?: number;
  signal?: AbortSignal;
}

/** Fetches a daily rate series for base -> target over the given window
 *  (default 30 days -- see the Timeframe type for the selectable presets).
 *  Returns an ordered array of { date, rate }. Falls back to the last
 *  cached series for the same pair/window if the network request fails,
 *  and returns [] only when neither a live nor a cached series exists --
 *  an expected, non-error outcome for pairs the historical source doesn't
 *  cover. */
export async function fetchHistory(
  base: string,
  target: string,
  { days = 30, signal }: FetchHistoryOptions = {}
): Promise<HistoryPoint[]> {
  if (base === target) return [];
  const key = cacheKey(base, target, days);
  const start = isoDaysAgo(days);
  const end = isoDaysAgo(0);
  const url = `${HISTORY_ENDPOINT}/${start}..${end}?from=${base}&to=${target}`;

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch {
    return dbGet<HistoryPoint[]>(key, []);
  }
  if (!res.ok) return dbGet<HistoryPoint[]>(key, []);

  const data = (await res.json()) as FrankfurterResponse;
  const rates = data?.rates;
  if (!rates || typeof rates !== "object") return dbGet<HistoryPoint[]>(key, []);

  const points = Object.keys(rates)
    .sort()
    .map((date) => ({ date, rate: rates[date][target] }))
    .filter((point): point is HistoryPoint => typeof point.rate === "number");

  if (points.length > 0) {
    await dbSet(key, points);
    return points;
  }
  return dbGet<HistoryPoint[]>(key, []);
}
