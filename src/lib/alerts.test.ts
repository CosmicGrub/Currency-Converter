import { describe, expect, it } from "vitest";
import { currentAlertRate, isThresholdCrossed } from "./alerts.js";
import type { RateAlert } from "../types/index.js";

const rates = { USD: 1, EUR: 0.865939, GBP: 0.7422 };

function makeAlert(overrides: Partial<RateAlert> = {}): RateAlert {
  return {
    id: "a1",
    base: "USD",
    target: "EUR",
    direction: "above",
    threshold: 0.86,
    enabled: true,
    triggered: false,
    ...overrides,
  };
}

describe("currentAlertRate", () => {
  it("resolves the live rate for the alert's pair", () => {
    expect(currentAlertRate(makeAlert(), rates)).toBeCloseTo(0.865939, 10);
  });

  it("returns null when rates hasn't loaded", () => {
    expect(currentAlertRate(makeAlert(), null)).toBeNull();
  });

  it("returns null when the pair can't be resolved", () => {
    expect(currentAlertRate(makeAlert({ target: "ZZZ" }), rates)).toBeNull();
  });
});

describe("isThresholdCrossed", () => {
  it("'above': true once the rate reaches or exceeds the threshold", () => {
    const alert = makeAlert({ direction: "above", threshold: 0.86 });
    expect(isThresholdCrossed(alert, 0.865939)).toBe(true);
    expect(isThresholdCrossed(alert, 0.86)).toBe(true); // exactly at threshold counts
    expect(isThresholdCrossed(alert, 0.5)).toBe(false);
  });

  it("'below': true once the rate reaches or drops under the threshold", () => {
    const alert = makeAlert({ direction: "below", threshold: 0.8 });
    expect(isThresholdCrossed(alert, 0.7)).toBe(true);
    expect(isThresholdCrossed(alert, 0.8)).toBe(true); // exactly at threshold counts
    expect(isThresholdCrossed(alert, 0.9)).toBe(false);
  });

  it("returns false when the rate is unavailable", () => {
    expect(isThresholdCrossed(makeAlert(), null)).toBe(false);
  });
});
