import { describe, expect, it } from "vitest";
import { buildForecast, linearRegression, movingAverage, volatility } from "./forecast.js";
import type { HistoryPoint } from "../types/index.js";

function series(rates: number[]): HistoryPoint[] {
  return rates.map((rate, i) => ({ date: `2026-08-${String(i + 1).padStart(2, "0")}`, rate }));
}

describe("linearRegression", () => {
  it("fits a perfectly linear series exactly", () => {
    // rate = 1 + 0.5 * index
    const { slope, intercept } = linearRegression(series([1, 1.5, 2, 2.5, 3]));
    expect(slope).toBeCloseTo(0.5, 10);
    expect(intercept).toBeCloseTo(1, 10);
  });

  it("gives a ~zero slope for a flat series", () => {
    const { slope } = linearRegression(series([1, 1, 1, 1]));
    expect(slope).toBeCloseTo(0, 10);
  });

  it("handles a single point without dividing by zero", () => {
    expect(linearRegression(series([2.5]))).toEqual({ slope: 0, intercept: 2.5 });
  });

  it("handles an empty series", () => {
    expect(linearRegression([])).toEqual({ slope: 0, intercept: 0 });
  });
});

describe("movingAverage", () => {
  it("averages the last `window` points", () => {
    expect(movingAverage(series([1, 2, 3, 4, 5]), 3)).toBeCloseTo((3 + 4 + 5) / 3, 10);
  });

  it("averages everything when window exceeds the series length", () => {
    expect(movingAverage(series([1, 2, 3]), 10)).toBeCloseTo(2, 10);
  });

  it("returns null for an empty series", () => {
    expect(movingAverage([], 7)).toBeNull();
  });
});

describe("volatility", () => {
  it("is zero for a perfectly linear series (no residual noise)", () => {
    const points = series([1, 1.5, 2, 2.5, 3]);
    const { slope, intercept } = linearRegression(points);
    expect(volatility(points, slope, intercept)).toBeCloseTo(0, 10);
  });

  it("is positive for a noisy series", () => {
    const points = series([1, 1.6, 1.9, 2.7, 2.8]);
    const { slope, intercept } = linearRegression(points);
    expect(volatility(points, slope, intercept)).toBeGreaterThan(0);
  });
});

describe("buildForecast", () => {
  it("returns null with fewer than 3 points", () => {
    expect(buildForecast(series([1, 2]), "USD", "EUR")).toBeNull();
  });

  it("classifies a clearly rising series", () => {
    const forecast = buildForecast(series([1, 1.1, 1.2, 1.3, 1.4, 1.5]), "USD", "EUR");
    expect(forecast?.trend).toBe("rising");
    expect(forecast?.insight).toContain("strengthening");
    expect(forecast?.insight).toContain("not a financial forecast");
  });

  it("classifies a clearly falling series", () => {
    const forecast = buildForecast(series([1.5, 1.4, 1.3, 1.2, 1.1, 1]), "USD", "EUR");
    expect(forecast?.trend).toBe("falling");
    expect(forecast?.insight).toContain("weakening");
  });

  it("classifies a flat series", () => {
    const forecast = buildForecast(series([1, 1.0001, 0.9999, 1, 1.0001]), "USD", "EUR");
    expect(forecast?.trend).toBe("flat");
  });

  it("provides a projected next value derived from the regression line", () => {
    const forecast = buildForecast(series([1, 1.5, 2, 2.5, 3]), "USD", "EUR");
    // Next index (5) on the fitted line 1 + 0.5*i -> 3.5
    expect(forecast?.projectedNext).toBeCloseTo(3.5, 5);
  });
});
