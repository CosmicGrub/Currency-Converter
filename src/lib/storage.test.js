import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadJSON, saveJSON } from "./storage.js";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a value through save/load", () => {
    saveJSON("prefs", { base: "USD", target: "EUR" });
    expect(loadJSON("prefs", null)).toEqual({ base: "USD", target: "EUR" });
  });

  it("returns the fallback when nothing is stored", () => {
    expect(loadJSON("missing", "fallback")).toBe("fallback");
  });

  it("returns the fallback instead of throwing on corrupt JSON", () => {
    localStorage.setItem("exchangeboard:prefs", "{not valid json");
    expect(loadJSON("prefs", "fallback")).toBe("fallback");
  });

  it("namespaces keys so it doesn't collide with unrelated storage", () => {
    saveJSON("prefs", { a: 1 });
    expect(localStorage.getItem("exchangeboard:prefs")).not.toBeNull();
    expect(localStorage.getItem("prefs")).toBeNull();
  });

  it("does not throw when localStorage.setItem fails (e.g. quota/private mode)", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => saveJSON("prefs", { a: 1 })).not.toThrow();
    spy.mockRestore();
  });
});
