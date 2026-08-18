// ---------------------------------------------------------------------------
// Shared TypeScript interfaces for ExchangeBoard. These describe exactly the
// shapes already persisted to localStorage (see src/lib/storage.ts) and
// returned by the rate/history APIs — changing field names here is a
// backwards-compatibility break, not just a type change.
// ---------------------------------------------------------------------------

/** USD-indexed rate table: ratesUSD[code] = units of `code` per 1 USD. */
export type RateTable = Record<string, number>;

/** A named, saved snapshot of a basket's currency codes -- lets a user
 *  keep several baskets ("Europe trip", "Crypto watch") and swap the
 *  active basket's contents between them instead of only ever having one. */
export interface BasketPreset {
  id: string;
  name: string;
  codes: string[];
}

export type AlertDirection = "above" | "below";

/** A threshold-based rate alert: "notify when 1 BASE = TARGET goes
 *  {direction} {threshold}". `triggered` is hysteresis state -- true once
 *  the alert has fired for the current crossing, reset (silently, no
 *  re-notification) once the rate moves back to the armed side, so a
 *  rate hovering near the threshold doesn't spam repeat notifications. */
export interface RateAlert {
  id: string;
  base: string;
  target: string;
  direction: AlertDirection;
  threshold: number;
  enabled: boolean;
  triggered: boolean;
}

/** User preferences, persisted as localStorage["exchangeboard:prefs"].
 *  `basketPresets`/`alerts` were added after the original three fields --
 *  always read `prefs` through a defaults-merge (see App.tsx) so an
 *  older saved prefs blob missing these keys doesn't crash at runtime. */
export interface AppPrefs {
  base: string;
  target: string;
  favorites: string[];
  basket: string[];
  basketPresets: BasketPreset[];
  alerts: RateAlert[];
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
