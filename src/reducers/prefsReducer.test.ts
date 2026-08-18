import { describe, expect, it } from "vitest";
import { defaultPrefs, prefsReducer } from "./prefsReducer.js";
import type { RateAlert } from "../types/index.js";

describe("prefsReducer", () => {
  it("SET_BASE / SET_TARGET / SWAP_PAIR", () => {
    let state = prefsReducer(defaultPrefs, { type: "SET_BASE", code: "GBP" });
    expect(state.base).toBe("GBP");
    state = prefsReducer(state, { type: "SET_TARGET", code: "JPY" });
    expect(state.target).toBe("JPY");
    state = prefsReducer(state, { type: "SWAP_PAIR" });
    expect(state).toMatchObject({ base: "JPY", target: "GBP" });
  });

  it("TOGGLE_FAVORITE adds then removes a code", () => {
    let state = prefsReducer(defaultPrefs, { type: "TOGGLE_FAVORITE", code: "EUR" });
    expect(state.favorites).toEqual(["EUR"]);
    state = prefsReducer(state, { type: "TOGGLE_FAVORITE", code: "EUR" });
    expect(state.favorites).toEqual([]);
  });

  it("UPDATE_BASKET replaces the basket list", () => {
    const state = prefsReducer(defaultPrefs, { type: "UPDATE_BASKET", basket: ["EUR", "GBP"] });
    expect(state.basket).toEqual(["EUR", "GBP"]);
  });

  describe("basket presets", () => {
    it("SAVE_BASKET_PRESET snapshots the *current* basket, not any passed-in value", () => {
      const withBasket = { ...defaultPrefs, basket: ["EUR", "JPY"] };
      const state = prefsReducer(withBasket, {
        type: "SAVE_BASKET_PRESET",
        id: "p1",
        name: "Trip",
      });
      expect(state.basketPresets).toEqual([{ id: "p1", name: "Trip", codes: ["EUR", "JPY"] }]);
    });

    it("LOAD_BASKET_PRESET replaces the active basket with the preset's codes", () => {
      const withPreset = {
        ...defaultPrefs,
        basket: ["USD"],
        basketPresets: [{ id: "p1", name: "Trip", codes: ["EUR", "JPY"] }],
      };
      const state = prefsReducer(withPreset, { type: "LOAD_BASKET_PRESET", id: "p1" });
      expect(state.basket).toEqual(["EUR", "JPY"]);
    });

    it("LOAD_BASKET_PRESET is a no-op for an unknown id", () => {
      const withBasket = { ...defaultPrefs, basket: ["USD"] };
      const state = prefsReducer(withBasket, { type: "LOAD_BASKET_PRESET", id: "missing" });
      expect(state.basket).toEqual(["USD"]);
    });

    it("DELETE_BASKET_PRESET removes only the matching preset", () => {
      const withPresets = {
        ...defaultPrefs,
        basketPresets: [
          { id: "p1", name: "Trip", codes: ["EUR"] },
          { id: "p2", name: "Crypto", codes: ["BTC"] },
        ],
      };
      const state = prefsReducer(withPresets, { type: "DELETE_BASKET_PRESET", id: "p1" });
      expect(state.basketPresets).toEqual([{ id: "p2", name: "Crypto", codes: ["BTC"] }]);
    });
  });

  describe("rate alerts", () => {
    const alert: RateAlert = {
      id: "a1",
      base: "USD",
      target: "EUR",
      direction: "above",
      threshold: 0.9,
      enabled: true,
      triggered: false,
    };

    it("ADD_ALERT appends an alert", () => {
      const state = prefsReducer(defaultPrefs, { type: "ADD_ALERT", alert });
      expect(state.alerts).toEqual([alert]);
    });

    it("REMOVE_ALERT removes only the matching alert", () => {
      const withAlerts = { ...defaultPrefs, alerts: [alert, { ...alert, id: "a2" }] };
      const state = prefsReducer(withAlerts, { type: "REMOVE_ALERT", id: "a1" });
      expect(state.alerts).toEqual([{ ...alert, id: "a2" }]);
    });

    it("TOGGLE_ALERT flips enabled without touching other alerts", () => {
      const other = { ...alert, id: "a2", enabled: true };
      const withAlerts = { ...defaultPrefs, alerts: [alert, other] };
      const state = prefsReducer(withAlerts, { type: "TOGGLE_ALERT", id: "a1" });
      expect(state.alerts[0].enabled).toBe(false);
      expect(state.alerts[1]).toEqual(other);
    });

    it("MARK_ALERT_TRIGGERED sets the triggered flag on the matching alert", () => {
      const withAlerts = { ...defaultPrefs, alerts: [alert] };
      const state = prefsReducer(withAlerts, {
        type: "MARK_ALERT_TRIGGERED",
        id: "a1",
        triggered: true,
      });
      expect(state.alerts[0].triggered).toBe(true);
    });
  });

  it("returns the same state for an unknown action (default branch)", () => {
    // @ts-expect-error -- intentionally invalid action type for the test
    expect(prefsReducer(defaultPrefs, { type: "NOT_A_REAL_ACTION" })).toBe(defaultPrefs);
  });
});
