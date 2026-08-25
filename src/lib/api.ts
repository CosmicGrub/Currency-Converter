import { loadJSON, saveJSON } from "./storage.js";
import { erApiResponseSchema } from "./schemas.js";
import { DataSourceError, toNetworkError } from "./errors.js";
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

/** Fetches the latest USD-based rate table.
 *  Returns { rates, asOf }. Throws a DataSourceError on network failure, a
 *  malformed response body, an unexpected response shape, or an explicit
 *  API-reported failure — see src/lib/errors.ts for what each kind means
 *  and why they're distinguished. */
export async function fetchRates(): Promise<RatesCache> {
  let res: Response;
  try {
    res = await fetch(RATES_ENDPOINT);
  } catch (cause) {
    throw toNetworkError("rates", cause);
  }

  let raw: unknown;
  try {
    raw = await res.json();
  } catch (cause) {
    // A response that isn't valid JSON at all is functionally identical to
    // a network failure from every caller's perspective (both mean "fall
    // back to the offline cache"), so it's bucketed the same way rather
    // than getting its own kind.
    throw toNetworkError("rates", cause);
  }

  const parsed = erApiResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new DataSourceError(
      "shape",
      "rates",
      `rates: unexpected response shape (${parsed.error.issues[0]?.message ?? "validation failed"})`
    );
  }
  if (parsed.data.result !== "success") {
    throw new DataSourceError("http", "rates", `rates: API reported failure (result="${parsed.data.result}")`);
  }

  const result: RatesCache = { rates: parsed.data.rates, asOf: parsed.data.time_last_update_utc };
  saveJSON(CACHE_KEY, result);
  return result;
}

/** Last successfully fetched rate table from a previous session/request, if any. */
export function getCachedRates(): RatesCache | null {
  return loadJSON<RatesCache | null>(CACHE_KEY, null);
}
