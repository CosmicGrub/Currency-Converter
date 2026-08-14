// ---------------------------------------------------------------------------
// Shared TypeScript interfaces for ExchangeBoard. These describe exactly the
// shapes already persisted to localStorage (see src/lib/storage.ts) and
// returned by the rate/history APIs — changing field names here is a
// backwards-compatibility break, not just a type change.
// ---------------------------------------------------------------------------

/** USD-indexed rate table: ratesUSD[code] = units of `code` per 1 USD. */
export type RateTable = Record<string, number>;

/** User preferences, persisted as localStorage["exchangeboard:prefs"]. */
export interface AppPrefs {
  base: string;
  target: string;
  favorites: string[];
  basket: string[];
}

/** Last successful rate fetch, persisted as localStorage["exchangeboard:ratesCache"]. */
export interface RatesCache {
  rates: RateTable;
  asOf: string;
}

/** A single dated point in a historical rate series. */
export interface HistoryPoint {
  date: string;
  rate: number;
}

/** Historical time series keyed by ISO date, then by target currency code —
 *  mirrors the shape of the frankfurter.dev `rates` payload field. */
export interface HistoricalData {
  rates: Record<string, Record<string, number>>;
}

export type Status = "loading" | "ready" | "error";

/** Supported history chart timeframes (Phase 3). */
export type Timeframe = "7D" | "30D" | "90D" | "1Y";
