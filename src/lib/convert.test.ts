import { describe, expect, it } from "vitest";
import fc from "fast-check";
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

// ---------------------------------------------------------------------------
// Property-based tests (fast-check). The example-based tests above pin down
// specific, human-picked cases; these instead state an invariant that must
// hold for *every* valid input fast-check can generate, then let it search
// for a counterexample across hundreds of random cases per run -- exactly
// the kind of edge case ("what if a rate is 0.0001 and the amount is
// 999999999.7?") a human writing examples by hand wouldn't think to try.
// ---------------------------------------------------------------------------

/** A finite, strictly-positive rate -- the only values a real rates table
 *  from open.er-api.com ever actually contains (a currency with a zero or
 *  negative exchange rate isn't a real scenario this app needs to handle;
 *  rateBetween's explicit null-guards for that are covered by the
 *  example-based tests above instead). */
const validRate = fc.double({ min: 0.0001, max: 100_000, noNaN: true, noDefaultInfinity: true });

/** A plausible USD-indexed rates table (2-6 distinct currencies, every
 *  entry finite and positive) paired with two currency codes actually
 *  present in it -- base and target may coincide, which is exactly the
 *  reflexivity case one of the properties below checks. */
const validRatesWithPair = fc
  .dictionary(fc.constantFrom("USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN"), validRate, {
    minKeys: 2,
  })
  .chain((rates) => {
    const codes = Object.keys(rates);
    return fc.tuple(fc.constantFrom(...codes), fc.constantFrom(...codes)).map(([base, target]) => ({
      rates,
      base,
      target,
    }));
  });

describe("rateBetween (property-based)", () => {
  it("never returns null, NaN, or a non-finite result for a fully-populated, all-positive table", () => {
    fc.assert(
      fc.property(validRatesWithPair, ({ rates, base, target }) => {
        const rate = rateBetween(rates, base, target);
        expect(rate).not.toBeNull();
        expect(Number.isFinite(rate as number)).toBe(true);
      })
    );
  });

  it("is always exactly 1 when base and target are the same currency", () => {
    fc.assert(
      fc.property(validRatesWithPair, ({ rates, base }) => {
        expect(rateBetween(rates, base, base)).toBe(1);
      })
    );
  });

  it("round-trips: base->target times target->base is always ~1", () => {
    fc.assert(
      fc.property(validRatesWithPair, ({ rates, base, target }) => {
        const forward = rateBetween(rates, base, target) as number;
        const backward = rateBetween(rates, target, base) as number;
        expect(forward * backward).toBeCloseTo(1, 6);
      })
    );
  });
});

describe("convertAmount (property-based)", () => {
  it("never produces NaN or a non-finite result for any finite amount against a valid table", () => {
    fc.assert(
      fc.property(
        validRatesWithPair,
        fc.double({ min: -1_000_000_000, max: 1_000_000_000, noNaN: true, noDefaultInfinity: true }),
        ({ rates, base, target }, amount) => {
          const result = convertAmount(amount, rates, base, target);
          expect(result).not.toBeNull();
          expect(Number.isFinite(result as number)).toBe(true);
        }
      )
    );
  });

  it("scales linearly with the amount (convert(k*x) ~= k * convert(x))", () => {
    fc.assert(
      fc.property(
        validRatesWithPair,
        fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.5, max: 5, noNaN: true, noDefaultInfinity: true }),
        ({ rates, base, target }, amount, k) => {
          const base_ = convertAmount(amount, rates, base, target) as number;
          const scaled = convertAmount(amount * k, rates, base, target) as number;
          expect(scaled).toBeCloseTo(base_ * k, 3);
        }
      )
    );
  });
});

describe("applyMarkup (property-based)", () => {
  it("never increases the rate for any markup percentage in [0, 1]", () => {
    fc.assert(
      fc.property(
        validRate,
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (rate, markupPct) => {
          const marked = applyMarkup(rate, markupPct) as number;
          // A tiny epsilon absorbs floating-point rounding at markupPct === 0,
          // where `rate * (1 - 0)` isn't always bit-for-bit identical to `rate`.
          expect(marked).toBeLessThanOrEqual(rate + 1e-9);
        }
      )
    );
  });

  it("is the identity at exactly 0% markup", () => {
    fc.assert(
      fc.property(validRate, (rate) => {
        expect(applyMarkup(rate, 0)).toBe(rate);
      })
    );
  });
});
