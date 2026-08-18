import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOLD_STATE,
  getFoldState,
  isFlexMode,
  isNativeFoldCapable,
  onFoldStateChanged,
} from "./foldState.js";
import type { FoldState } from "./foldState.js";

describe("isFlexMode", () => {
  it("is false for the default (no fold) state", () => {
    expect(isFlexMode(DEFAULT_FOLD_STATE)).toBe(false);
  });

  it("is true only for HALF_OPENED + HORIZONTAL", () => {
    const flex: FoldState = { hasFold: true, state: "HALF_OPENED", orientation: "HORIZONTAL", isSeparating: true };
    expect(isFlexMode(flex)).toBe(true);
  });

  it("is false for HALF_OPENED + VERTICAL (book mode, not tabletop)", () => {
    const book: FoldState = { hasFold: true, state: "HALF_OPENED", orientation: "VERTICAL", isSeparating: true };
    expect(isFlexMode(book)).toBe(false);
  });

  it("is false when FLAT even if a fold exists", () => {
    const flat: FoldState = { hasFold: true, state: "FLAT", orientation: "HORIZONTAL", isSeparating: false };
    expect(isFlexMode(flat)).toBe(false);
  });
});

describe("browser/jsdom fallback (no native Capacitor bridge present)", () => {
  it("isNativeFoldCapable is false outside a native Android shell", () => {
    expect(isNativeFoldCapable()).toBe(false);
  });

  it("getFoldState resolves to the default state, never throws", async () => {
    await expect(getFoldState()).resolves.toEqual(DEFAULT_FOLD_STATE);
  });

  it("onFoldStateChanged returns a safe no-op unsubscribe", () => {
    const unsubscribe = onFoldStateChanged(() => {
      throw new Error("should never be called outside the native shell");
    });
    expect(() => unsubscribe()).not.toThrow();
  });
});
