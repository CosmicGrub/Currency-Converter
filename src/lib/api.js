// ---------------------------------------------------------------------------
// Exchange rate data source. Free, no API key, CORS-enabled, ~160 currencies,
// updated ~daily. Called once on mount (and on manual refresh) — every
// conversion after that is computed client-side, no per-keystroke calls.
// ---------------------------------------------------------------------------
const RATES_ENDPOINT = "https://open.er-api.com/v6/latest/USD";

/** Fetches the latest USD-based rate table.
 *  Returns { rates, asOf }. Throws on network failure or a non-success API response. */
export async function fetchRates() {
  const res = await fetch(RATES_ENDPOINT);
  const data = await res.json();
  if (data.result !== "success") throw new Error("bad response");
  return { rates: data.rates, asOf: data.time_last_update_utc };
}
