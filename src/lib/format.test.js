import { describe, expect, it } from "vitest";
import { fmt, rawNum } from "./format.js";

describe("fmt", () => {
  it("formats a currency amount with the code's symbol", () => {
    expect(fmt(1.5, "USD")).toBe("$1.50");
  });

  it("uses more decimal places for sub-1 amounts", () => {
    expect(fmt(0.865939, "EUR")).toBe("€0.865939");
  });

  it("falls back to a plain number + code when Intl rejects the currency code", () => {
    // "US" isn't a valid 3-letter ISO 4217 code -- Intl.NumberFormat throws a
    // RangeError constructing it, which is exactly the fallback path we're testing.
    expect(fmt(12.3456, "US")).toBe("12.3456 US");
  });
});

describe("rawNum", () => {
  it("formats with thousands separators and up to 6 decimals", () => {
    expect(rawNum(197407.5775)).toBe("197,407.5775");
  });

  it("handles whole numbers without a trailing decimal", () => {
    expect(rawNum(250)).toBe("250");
  });
});
