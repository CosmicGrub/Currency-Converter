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

function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Fetches a ~30-day daily rate series for base -> target.
 *  Returns an ordered array of { date, rate }. Returns [] if the pair isn't
 *  covered by the historical source (not an error -- just no chart to show). */
export async function fetchHistory(base, target, { days = 30, signal } = {}) {
  if (base === target) return [];
  const start = isoDaysAgo(days);
  const end = isoDaysAgo(0);
  const url = `${HISTORY_ENDPOINT}/${start}..${end}?from=${base}&to=${target}`;

  let res;
  try {
    res = await fetch(url, { signal });
  } catch {
    return [];
  }
  if (!res.ok) return [];

  const data = await res.json();
  const rates = data?.rates;
  if (!rates || typeof rates !== "object") return [];

  return Object.keys(rates)
    .sort()
    .map((date) => ({ date, rate: rates[date][target] }))
    .filter((point) => typeof point.rate === "number");
}
