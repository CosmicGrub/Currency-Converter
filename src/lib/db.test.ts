import { beforeEach, describe, expect, it } from "vitest";
import { dbGet, dbSet, dbDel, schemaVersionMismatch, SCHEMA_VERSION } from "./db.js";
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

// schemaVersionMismatch is the pure decision logic behind db.ts's
// IndexedDB schema-versioning wipe (see the "Schema versioning" section
// there) -- unit-tested directly, in isolation from the actual IndexedDB
// read/wipe/write it gates, which jsdom (this test environment) can't
// exercise for real anyway.
describe("schemaVersionMismatch", () => {
  it("is a mismatch when nothing has ever been versioned (undefined)", () => {
    // Every session before this feature existed -- not a real version
    // bump to react to, but treated identically: nothing trustworthy is
    // stamped, so there's nothing safe to assume about what's stored.
    expect(schemaVersionMismatch(undefined, SCHEMA_VERSION)).toBe(true);
  });

  it("is not a mismatch when the stored version matches", () => {
    expect(schemaVersionMismatch(SCHEMA_VERSION, SCHEMA_VERSION)).toBe(false);
  });

  it("is a mismatch when the stored version is older than current", () => {
    expect(schemaVersionMismatch(1, 2)).toBe(true);
  });

  it("is a mismatch even when the stored version is newer (e.g. a downgrade)", () => {
    expect(schemaVersionMismatch(3, 2)).toBe(true);
  });
});
