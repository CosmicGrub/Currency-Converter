import type { RateTable } from "../types/index.js";

// ---------------------------------------------------------------------------
// Base-agnostic conversion math. The API gives us one USD-indexed table
// (ratesUSD[code] = units of `code` per 1 USD, with ratesUSD.USD === 1), so
// any base -> any target is just a ratio through USD -- no extra fetches,
// no matter which currency the user picks as "from".
// ---------------------------------------------------------------------------

/** 1 unit of `base` in units of `target`, or null if either rate is missing
 *  or not a finite number. */
export function rateBetween(
  ratesUSD: RateTable | null | undefined,
  base: string,
  target: string
): number | null {
  if (!ratesUSD) return null;
  const baseRate = ratesUSD[base];
  const targetRate = ratesUSD[target];
  if (typeof baseRate !== "number" || !isFinite(baseRate) || baseRate === 0) return null;
  if (typeof targetRate !== "number" || !isFinite(targetRate)) return null;
  return targetRate / baseRate;
}

/** Converts `amount` units of `base` into `target`, or null if inputs are
 *  incomplete or `amount` isn't a finite number. */
export function convertAmount(
  amount: number,
  ratesUSD: RateTable | null | undefined,
  base: string,
  target: string
): number | null {
  const rate = rateBetween(ratesUSD, base, target);
  if (rate === null || typeof amount !== "number" || !isFinite(amount)) return null;
  return amount * rate;
}
