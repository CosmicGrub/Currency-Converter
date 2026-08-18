import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CRYPTO_ASSETS,
  CRYPTO_NAMES,
  fetchCryptoRates,
  fetchCryptoRatesSafe,
  getCachedCryptoRates,
  toRateTableFragment,
} from "./crypto.js";

describe("CRYPTO_ASSETS / CRYPTO_NAMES", () => {
  it("is a fixed, curated set of exactly the 10 blue-chip coins", () => {
    expect(Object.keys(CRYPTO_ASSETS).sort()).toEqual(
      ["ADA", "BCH", "BNB", "BTC", "ETC", "ETH", "LTC", "TRX", "XLM", "XRP"].sort()
    );
  });

  it("every asset has a non-empty CoinGecko id and display name", () => {
    for (const [code, { id, name }] of Object.entries(CRYPTO_ASSETS)) {
      expect(id.length, `${code} id`).toBeGreaterThan(0);
      expect(name.length, `${code} name`).toBeGreaterThan(0);
    }
  });

  it("CRYPTO_NAMES mirrors CRYPTO_ASSETS' codes and names", () => {
    for (const [code, { name }] of Object.entries(CRYPTO_ASSETS)) {
      expect(CRYPTO_NAMES[code]).toBe(name);
    }
  });
});

describe("toRateTableFragment", () => {
  it("inverts USD prices into units-per-USD, matching the rates table shape", () => {
    const fragment = toRateTableFragment({ bitcoin: { usd: 50000 }, ethereum: { usd: 2500 } });
    expect(fragment.BTC).toBeCloseTo(1 / 50000, 12);
    expect(fragment.ETH).toBeCloseTo(1 / 2500, 12);
  });

  it("skips coins missing from the response instead of throwing", () => {
    const fragment = toRateTableFragment({ bitcoin: { usd: 50000 } });
    expect(fragment.BTC).toBeDefined();
    expect(fragment.ETH).toBeUndefined();
  });

  it("skips non-positive or non-finite prices", () => {
    const fragment = toRateTableFragment({
      bitcoin: { usd: 0 },
      ethereum: { usd: -5 },
      ripple: { usd: NaN },
    });
    expect(fragment).toEqual({});
  });
});

describe("fetchCryptoRates / fetchCryptoRatesSafe", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and caches a live rate fragment", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ bitcoin: { usd: 50000 } }),
        })
      )
    );
    const rates = await fetchCryptoRates();
    expect(rates.BTC).toBeCloseTo(1 / 50000, 12);
    expect(getCachedCryptoRates()?.BTC).toBeCloseTo(1 / 50000, 12);
  });

  it("fetchCryptoRatesSafe falls back to the cache on network failure, never throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ bitcoin: { usd: 40000 } }) }))
    );
    await fetchCryptoRates(); // seed the cache

    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down")))
    );
    const rates = await fetchCryptoRatesSafe();
    expect(rates.BTC).toBeCloseTo(1 / 40000, 12);
  });

  it("fetchCryptoRatesSafe returns {} when neither a live fetch nor a cache is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("network down")))
    );
    expect(await fetchCryptoRatesSafe()).toEqual({});
  });
});
