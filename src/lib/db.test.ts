import { beforeEach, describe, expect, it } from "vitest";
import { dbGet, dbSet, dbDel } from "./db.js";
import { loadJSON } from "./storage.js";

// jsdom (the Vitest test environment here) doesn't implement IndexedDB, so
// these tests exercise the fallback chain's localStorage tier -- exactly
// the path real "IndexedDB unavailable" environments (locked-down
// webviews, some private-mode browsers) take too.
describe("db fallback chain", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value and mirrors it to localStorage", async () => {
    await dbSet("history:USD:EUR:30d", [{ date: "2026-08-01", rate: 0.87 }]);
    expect(await dbGet("history:USD:EUR:30d", [])).toEqual([{ date: "2026-08-01", rate: 0.87 }]);
    // Mirrored under the existing namespaced localStorage convention.
    expect(loadJSON("history:USD:EUR:30d", null)).toEqual([{ date: "2026-08-01", rate: 0.87 }]);
  });

  it("returns the fallback when nothing is stored anywhere", async () => {
    expect(await dbGet("missing-key", "fallback")).toBe("fallback");
  });

  it("removes a value from every tier", async () => {
    await dbSet("temp-key", 42);
    await dbDel("temp-key");
    expect(await dbGet("temp-key", null)).toBeNull();
  });
});
