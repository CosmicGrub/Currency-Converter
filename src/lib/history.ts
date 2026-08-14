import type { HistoryPoint } from "../types/index.js";

// ---------------------------------------------------------------------------
// Historical rate series for the sparkline chart. open.er-api.com only
// serves the latest snapshot, so history comes from a second, purpose-built
// free/no-key source: frankfurter.dev (ECB reference rates, formerly hosted
// at frankfurter.app -- that domain now 301s here without CORS headers, so
// this exact host is required). It covers a smaller currency set (~30, all
// major) than open.er-api's ~160 -- callers should treat "unsupported pair"
// as an expected, non-error outcome.
// ---------------------------------------------------------------------------
const HISTORY_ENDPOINT = "https://api.frankfurter.dev/v1";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
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
 *  Returns an ordered array of { date, rate }. Returns [] if the pair isn't
 *  covered by the historical source (not an error -- just no chart to show). */
export async function fetchHistory(
  base: string,
  target: string,
  { days = 30, signal }: FetchHistoryOptions = {}
): Promise<HistoryPoint[]> {
  if (base === target) return [];
  const start = isoDaysAgo(days);
  const end = isoDaysAgo(0);
  const url = `${HISTORY_ENDPOINT}/${start}..${end}?from=${base}&to=${target}`;

  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = (await res.json()) as FrankfurterResponse;
  const rates = data?.rates;
  if (!rates || typeof rates !== "object") return [];

  return Object.keys(rates)
    .sort()
    .map((date) => ({ date, rate: rates[date][target] }))
    .filter((point): point is HistoryPoint => typeof point.rate === "number");
}
