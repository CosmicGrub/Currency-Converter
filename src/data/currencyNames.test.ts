import { describe, expect, it } from "vitest";
import { CURRENCY_NAMES, QUICK_PICKS } from "./currencyNames.js";

describe("CURRENCY_NAMES", () => {
  it("keys are well-formed 3-letter uppercase ISO-style codes", () => {
    for (const code of Object.keys(CURRENCY_NAMES)) {
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it("has no blank names", () => {
    for (const [code, name] of Object.entries(CURRENCY_NAMES)) {
      expect(name.trim().length, `${code} has a blank name`).toBeGreaterThan(0);
    }
  });

  it("covers a comprehensive set of currently-circulating currencies plus crypto (179+)", () => {
    // Regression guard for the ISO 4217 completeness pass -- fails loudly if
    // entries are accidentally dropped in a future edit.
    expect(Object.keys(CURRENCY_NAMES).length).toBeGreaterThanOrEqual(179);
  });

  it("includes the recently-introduced/redenominated codes rounding out coverage", () => {
    for (const code of ["BYN", "SSP", "SVC", "SLE", "XCG", "VED", "ZWG", "ZWL", "XDR", "XPD", "XPT"]) {
      expect(CURRENCY_NAMES).toHaveProperty(code);
    }
  });

  it("includes the curated blue-chip crypto assets", () => {
    for (const code of ["BTC", "ETH", "XRP", "BCH", "LTC", "XLM", "ETC", "ADA", "TRX", "BNB"]) {
      expect(CURRENCY_NAMES).toHaveProperty(code);
    }
  });
});

describe("QUICK_PICKS", () => {
  it("every quick pick has a name in CURRENCY_NAMES", () => {
    for (const code of QUICK_PICKS) {
      expect(CURRENCY_NAMES).toHaveProperty(code);
    }
  });
});
