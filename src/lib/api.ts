import { loadJSON, saveJSON } from "./storage.js";
import type { RatesCache } from "../types/index.js";

// ---------------------------------------------------------------------------
// Exchange rate data source. Free, no API key, CORS-enabled, ~160 currencies,
// updated ~daily. Called once on mount (and on manual refresh) — every
// conversion after that is computed client-side, no per-keystroke calls.
//
// Every successful fetch is cached to localStorage so a later failed fetch
// (offline, API down) can fall back to the last known-good table instead of
// a hard error.
// ---------------------------------------------------------------------------
const RATES_ENDPOINT = "https://open.er-api.com/v6/latest/USD";
const CACHE_KEY = "ratesCache";

interface ErApiResponse {
  result: string;
  base_code: string;
  time_last_update_utc: string;
  rates: Record<string, number>;
}

/** Fetches the latest USD-based rate table.
 *  Returns { rates, asOf }. Throws on network failure or a non-success API response. */
export async function fetchRates(): Promise<RatesCache> {
  const res = await fetch(RATES_ENDPOINT);
  const data = (await res.json()) as ErApiResponse;
  if (data.result !== "success") throw new Error("bad response");
  const result: RatesCache = { rates: data.rates, asOf: data.time_last_update_utc };
  saveJSON(CACHE_KEY, result);
  return result;
}

/** Last successfully fetched rate table from a previous session/request, if any. */
export function getCachedRates(): RatesCache | null {
  return loadJSON<RatesCache | null>(CACHE_KEY, null);
}
