import { describe, expect, it } from "vitest";
import { toCSV } from "./csv.js";

describe("toCSV", () => {
  it("writes a header row from the first row's keys, in column order", () => {
    const csv = toCSV([{ code: "EUR", amount: 100 }]);
    expect(csv).toBe("code,amount\r\nEUR,100");
  });

  it("respects an explicit column order/subset over object key order", () => {
    const csv = toCSV([{ b: 2, a: 1 }], ["a", "b"]);
    expect(csv).toBe("a,b\r\n1,2");
  });

  it("quotes a field containing a comma", () => {
    const csv = toCSV([{ name: "Renminbi, Yuan" }]);
    expect(csv).toBe('name\r\n"Renminbi, Yuan"');
  });

  it("quotes and doubles embedded quotes", () => {
    const csv = toCSV([{ name: 'The "Buck"' }]);
    expect(csv).toBe('name\r\n"The ""Buck"""');
  });

  it("quotes a field containing a newline", () => {
    const csv = toCSV([{ note: "line one\nline two" }]);
    expect(csv).toBe('note\r\n"line one\nline two"');
  });

  it("returns just the header line for an empty row array with explicit columns", () => {
    expect(toCSV([], ["code", "amount"])).toBe("code,amount");
  });

  it("fills a missing/undefined field with an empty string rather than 'undefined'", () => {
    const csv = toCSV([{ code: "EUR" }] as { code: string; amount?: number }[], [
      "code",
      "amount",
    ]);
    expect(csv).toBe("code,amount\r\nEUR,");
  });
});
