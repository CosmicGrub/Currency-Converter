import { describe, expect, it } from "vitest";
import { buildQuestion, pickWeightedCode, recordAnswer, weightFor } from "./currencyQuiz.js";
import type { QuizStats } from "./currencyQuiz.js";

describe("weightFor", () => {
  it("gives unseen codes the flat head-start weight", () => {
    expect(weightFor({}, "USD")).toBe(3);
  });

  it("gives a perfect-record code the minimum weight", () => {
    const stats: QuizStats = { USD: { correct: 5, incorrect: 0 } };
    expect(weightFor(stats, "USD")).toBe(1);
  });

  it("weights a frequently-missed code higher than a rarely-missed one", () => {
    const stats: QuizStats = {
      OFTEN_MISSED: { correct: 1, incorrect: 9 },
      RARELY_MISSED: { correct: 9, incorrect: 1 },
    };
    expect(weightFor(stats, "OFTEN_MISSED")).toBeGreaterThan(weightFor(stats, "RARELY_MISSED"));
  });
});

describe("pickWeightedCode", () => {
  it("only ever returns a code that was in the pool", () => {
    const pool = ["USD", "EUR", "GBP"];
    for (let i = 0; i < 20; i++) {
      expect(pool).toContain(pickWeightedCode({}, pool));
    }
  });

  it("always picks the single available code", () => {
    expect(pickWeightedCode({}, ["USD"])).toBe("USD");
  });

  it("throws on an empty pool rather than silently returning garbage", () => {
    expect(() => pickWeightedCode({}, [])).toThrow();
  });
});

describe("buildQuestion", () => {
  it("returns 4 options including the correct answer, drawn from the given pool", () => {
    const q = buildQuestion({}, ["USD", "EUR", "GBP", "JPY", "CAD"]);
    expect(q.options).toHaveLength(4);
    expect(q.options).toContain(q.correctName);
    expect(new Set(q.options).size).toBe(4); // no duplicate options
  });

  it("resolves the correct name for the picked code", () => {
    const q = buildQuestion({}, ["USD"]);
    expect(q.code).toBe("USD");
    expect(q.correctName).toBe("United States Dollar");
  });
});

describe("recordAnswer", () => {
  it("increments correct without mutating the input stats", () => {
    const before: QuizStats = {};
    const after = recordAnswer(before, "USD", true);
    expect(before).toEqual({});
    expect(after).toEqual({ USD: { correct: 1, incorrect: 0 } });
  });

  it("increments incorrect and preserves other codes' stats", () => {
    const before: QuizStats = { USD: { correct: 2, incorrect: 1 }, EUR: { correct: 0, incorrect: 3 } };
    const after = recordAnswer(before, "USD", false);
    expect(after.USD).toEqual({ correct: 2, incorrect: 2 });
    expect(after.EUR).toEqual({ correct: 0, incorrect: 3 });
  });
});
