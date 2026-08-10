// ---------------------------------------------------------------------------
// Base-agnostic conversion math. The API gives us one USD-indexed table
// (ratesUSD[code] = units of `code` per 1 USD, with ratesUSD.USD === 1), so
// any base -> any target is just a ratio through USD -- no extra fetches,
// no matter which currency the user picks as "from".
// ---------------------------------------------------------------------------

/** 1 unit of `base` in units of `target`, or null if either rate is missing. */
export function rateBetween(ratesUSD, base, target) {
  if (!ratesUSD || !ratesUSD[base] || !ratesUSD[target]) return null;
  return ratesUSD[target] / ratesUSD[base];
}

/** Converts `amount` units of `base` into `target`, or null if inputs are incomplete. */
export function convertAmount(amount, ratesUSD, base, target) {
  const rate = rateBetween(ratesUSD, base, target);
  if (rate === null || isNaN(amount)) return null;
  return amount * rate;
}
