import { z } from "zod";

// ---------------------------------------------------------------------------
// Runtime shape validation for the three external APIs this app trusts
// (open.er-api.com, frankfurter.dev, coingecko.com). None of them are
// versioned or contractually stable -- they're free, keyless, best-effort
// public services -- so before this, every response was cast straight to
// its TypeScript interface with `as` and trusted blindly. TypeScript types
// are compile-time only and enforce nothing about what actually arrives
// over the wire: if any of these ever changed shape (a renamed field, a
// `rates` value that's a string instead of a number, a field dropped
// entirely), the bad data would have flowed straight into `rateBetween()`/
// `convertAmount()` and shown up as a silent `NaN` or a wrong number in the
// result panel -- never a caught, explainable error.
//
// These schemas are deliberately permissive about *extra* fields (zod
// objects ignore unknown keys by default) and strict only about the shape
// this app actually reads -- so an API adding a new field it doesn't touch
// yet is never a breaking change here.
// ---------------------------------------------------------------------------

/** open.er-api.com's /v6/latest/USD response -- see src/lib/api.ts. */
export const erApiResponseSchema = z.object({
  result: z.string(),
  base_code: z.string(),
  time_last_update_utc: z.string(),
  rates: z.record(z.string(), z.number()),
});

export type ErApiResponse = z.infer<typeof erApiResponseSchema>;

/** frankfurter.dev's time-series response -- see src/lib/history.ts.
 *  `rates` is genuinely optional: an unsupported currency pair, or a
 *  window with no data, is a documented "no history for this" outcome
 *  from the API itself, not a shape violation. */
export const frankfurterResponseSchema = z.object({
  rates: z.record(z.string(), z.record(z.string(), z.number())).optional(),
});

export type FrankfurterResponse = z.infer<typeof frankfurterResponseSchema>;

/** coingecko.com's /simple/price response -- see src/lib/crypto.ts. Keyed
 *  by CoinGecko's own coin ids (e.g. "bitcoin"), which this app doesn't
 *  control -- `usd` is optional per-coin so a single delisted/renamed coin
 *  in CRYPTO_ASSETS degrades to "that one code is briefly absent," not a
 *  whole-response validation failure. */
export const coinGeckoPriceResponseSchema = z.record(z.string(), z.object({ usd: z.number().optional() }));

export type CoinGeckoPriceResponse = z.infer<typeof coinGeckoPriceResponseSchema>;
