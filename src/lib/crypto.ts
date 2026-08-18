import { loadJSON, saveJSON } from "./storage.js";
import type { RateTable } from "../types/index.js";

// ---------------------------------------------------------------------------
// Optional cryptocurrency layer, merged into the same USD-indexed `rates`
// table the rest of the app already uses (see src/lib/convert.ts) -- so
// every existing feature (picker, ticker, basket, matrix) works on crypto
// currencies for free, with zero changes to the core conversion formula.
//
// Deliberately a *curated, fixed* list, not "whatever's trending" -- every
// coin here has an unbroken multi-year trading history on major regulated
// exchanges. No stablecoins (they're just a fiat peg, not a distinct asset
// to convert into) and no meme-origin coins. This list is a product
// decision, not a technical one; changing it means editing CRYPTO_ASSETS
// below, nothing else.
//   BTC  Bitcoin            (2009)   ETC  Ethereum Classic   (2016)
//   ETH  Ethereum           (2015)   ADA  Cardano            (2017)
//   XRP  XRP                (2012)   TRX  TRON               (2017)
//   BCH  Bitcoin Cash       (2017)   BNB  BNB                (2017)
//   LTC  Litecoin           (2011)
//   XLM  Stellar Lumens     (2014)
//
// Data source: CoinGecko's public /simple/price endpoint -- free, no API
// key, CORS-enabled, same "free/no-key" pattern as open.er-api.com and
// frankfurter.dev elsewhere in this app. It returns each coin's price in
// USD; we invert that (1 / priceUSD) to get "units of COIN per 1 USD",
// exactly the shape `rates` already uses for fiat.
// ---------------------------------------------------------------------------

export const CRYPTO_ASSETS: Record<string, { id: string; name: string }> = {
  BTC: { id: "bitcoin", name: "Bitcoin" },
  ETH: { id: "ethereum", name: "Ethereum" },
  XRP: { id: "ripple", name: "XRP" },
  BCH: { id: "bitcoin-cash", name: "Bitcoin Cash" },
  LTC: { id: "litecoin", name: "Litecoin" },
  XLM: { id: "stellar", name: "Stellar Lumens" },
  ETC: { id: "ethereum-classic", name: "Ethereum Classic" },
  ADA: { id: "cardano", name: "Cardano" },
  TRX: { id: "tron", name: "TRON" },
  BNB: { id: "binancecoin", name: "BNB" },
};

/** Display names for every curated crypto asset -- merged into
 *  CURRENCY_NAMES by src/data/currencyNames.ts so the picker, search,
 *  basket, and matrix all show real names instead of bare codes. */
export const CRYPTO_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(CRYPTO_ASSETS).map(([code, { name }]) => [code, name])
);

const PRICE_ENDPOINT = "https://api.coingecko.com/api/v3/simple/price";
const CACHE_KEY = "cryptoRatesCache";

interface CryptoRatesCache {
  rates: RateTable;
  fetchedAt: string;
}

type CoinGeckoPriceResponse = Record<string, { usd?: number }>;

/** Converts CoinGecko's { [coingeckoId]: { usd: price } } response into a
 *  `rates`-shaped fragment: { [code]: unitsOfCodePerUSD }. Pure/sync so
 *  it's trivially testable without mocking fetch. */
export function toRateTableFragment(priceData: CoinGeckoPriceResponse): RateTable {
  const fragment: RateTable = {};
  for (const [code, { id }] of Object.entries(CRYPTO_ASSETS)) {
    const priceUsd = priceData[id]?.usd;
    if (typeof priceUsd === "number" && isFinite(priceUsd) && priceUsd > 0) {
      fragment[code] = 1 / priceUsd;
    }
  }
  return fragment;
}

/** Fetches live prices for every curated coin and returns a `rates`-shaped
 *  fragment ready to spread into the main USD-indexed table. Throws on
 *  network failure -- callers should prefer fetchCryptoRatesSafe() below
 *  unless they want to handle the fallback chain themselves. */
export async function fetchCryptoRates(): Promise<RateTable> {
  const ids = Object.values(CRYPTO_ASSETS)
    .map((a) => a.id)
    .join(",");
  const res = await fetch(`${PRICE_ENDPOINT}?ids=${ids}&vs_currencies=usd`);
  if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
  const data = (await res.json()) as CoinGeckoPriceResponse;
  const rates = toRateTableFragment(data);
  if (Object.keys(rates).length === 0) throw new Error("no usable crypto prices in response");
  saveJSON<CryptoRatesCache>(CACHE_KEY, { rates, fetchedAt: new Date().toISOString() });
  return rates;
}

/** Last successfully fetched crypto rate fragment, if any. */
export function getCachedCryptoRates(): RateTable | null {
  return loadJSON<CryptoRatesCache | null>(CACHE_KEY, null)?.rates ?? null;
}

/** Best-effort crypto rates: live fetch, falling back to the local cache,
 *  falling back to an empty fragment. Never throws -- crypto is additive
 *  and optional, so any failure here must leave the rest of the app
 *  (fiat conversion) completely unaffected. */
export async function fetchCryptoRatesSafe(): Promise<RateTable> {
  try {
    return await fetchCryptoRates();
  } catch {
    return getCachedCryptoRates() ?? {};
  }
}
