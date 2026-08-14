import { describe, expect, it } from "vitest";
import { applyMarkup, convertAmount, rateBetween } from "./convert.js";

// A representative slice of a real open.er-api.com USD-indexed rates table.
const ratesUSD = { USD: 1, EUR: 0.865939, GBP: 0.7422, JPY: 157.9261 };

describe("rateBetween", () => {
  it("returns the direct rate when converting from USD", () => {
    expect(rateBetween(ratesUSD, "USD", "EUR")).toBe(0.865939);
  });

  it("computes a non-USD base via the USD table (reverse conversion)", () => {
    const rate = rateBetween(ratesUSD, "EUR", "USD");
    expect(rate).toBeCloseTo(1 / 0.865939, 10);
  });

  it("chains two non-USD currencies through USD", () => {
    const rate = rateBetween(ratesUSD, "EUR", "JPY");
    expect(rate).toBeCloseTo(157.9261 / 0.865939, 10);
  });

  it("returns exactly 1 when base and target are the same", () => {
    expect(rateBetween(ratesUSD, "GBP", "GBP")).toBe(1);
  });

  it("returns null when a currency isn't in the table", () => {
    expect(rateBetween(ratesUSD, "USD", "ZZZ")).toBeNull();
  });

  it("returns null when rates hasn't loaded yet", () => {
    expect(rateBetween(null, "USD", "EUR")).toBeNull();
  });
});

describe("convertAmount", () => {
  it("multiplies the amount by the resolved rate", () => {
    expect(convertAmount(1250, ratesUSD, "USD", "JPY")).toBeCloseTo(197407.625, 5);
  });

  it("returns null for a non-numeric amount", () => {
    expect(convertAmount(NaN, ratesUSD, "USD", "EUR")).toBeNull();
  });

  it("returns null when the rate can't be resolved", () => {
    expect(convertAmount(10, ratesUSD, "USD", "ZZZ")).toBeNull();
  });
});

describe("applyMarkup", () => {
  it("returns the rate unchanged at 0% markup", () => {
    expect(applyMarkup(0.865939, 0)).toBe(0.865939);
  });

  it("reduces the rate by the markup percentage", () => {
    expect(applyMarkup(100, 0.015)).toBeCloseTo(98.5, 10);
    expect(applyMarkup(100, 0.03)).toBeCloseTo(97, 10);
  });

  it("propagates a null rate", () => {
    expect(applyMarkup(null, 0.015)).toBeNull();
  });
});
