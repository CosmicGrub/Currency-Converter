import type { AppPrefs, RateAlert } from "../types/index.js";

// ---------------------------------------------------------------------------
// Typed reducer for the persisted preference slice of app state (base,
// target, favorites, basket, basket presets, rate alerts). Isolating every
// mutation of `prefs` into a small, exhaustively-typed action keeps it
// explicit instead of ad-hoc setPrefs(p => ({ ...p, ... })) callbacks.
// ---------------------------------------------------------------------------
export type PrefsAction =
  | { type: "SET_BASE"; code: string }
  | { type: "SET_TARGET"; code: string }
  | { type: "SWAP_PAIR" }
  | { type: "TOGGLE_FAVORITE"; code: string }
  | { type: "UPDATE_BASKET"; basket: string[] }
  | { type: "SAVE_BASKET_PRESET"; id: string; name: string }
  | { type: "LOAD_BASKET_PRESET"; id: string }
  | { type: "DELETE_BASKET_PRESET"; id: string }
  | { type: "ADD_ALERT"; alert: RateAlert }
  | { type: "REMOVE_ALERT"; id: string }
  | { type: "TOGGLE_ALERT"; id: string }
  | { type: "MARK_ALERT_TRIGGERED"; id: string; triggered: boolean };

export const defaultPrefs: AppPrefs = {
  base: "USD",
  target: "EUR",
  favorites: [],
  basket: [],
  basketPresets: [],
  alerts: [],
};

export function prefsReducer(state: AppPrefs, action: PrefsAction): AppPrefs {
  switch (action.type) {
    case "SET_BASE":
      return { ...state, base: action.code };
    case "SET_TARGET":
      return { ...state, target: action.code };
    case "SWAP_PAIR":
      return { ...state, base: state.target, target: state.base };
    case "TOGGLE_FAVORITE":
      return {
        ...state,
        favorites: state.favorites.includes(action.code)
          ? state.favorites.filter((c) => c !== action.code)
          : [...state.favorites, action.code],
      };
    case "UPDATE_BASKET":
      return { ...state, basket: action.basket };

    case "SAVE_BASKET_PRESET":
      return {
        ...state,
        basketPresets: [
          ...state.basketPresets,
          { id: action.id, name: action.name, codes: state.basket },
        ],
      };
    case "LOAD_BASKET_PRESET": {
      const preset = state.basketPresets.find((p) => p.id === action.id);
      return preset ? { ...state, basket: preset.codes } : state;
    }
    case "DELETE_BASKET_PRESET":
      return {
        ...state,
        basketPresets: state.basketPresets.filter((p) => p.id !== action.id),
      };

    case "ADD_ALERT":
      return { ...state, alerts: [...state.alerts, action.alert] };
    case "REMOVE_ALERT":
      return { ...state, alerts: state.alerts.filter((a) => a.id !== action.id) };
    case "TOGGLE_ALERT":
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.id ? { ...a, enabled: !a.enabled } : a
        ),
      };
    case "MARK_ALERT_TRIGGERED":
      return {
        ...state,
        alerts: state.alerts.map((a) =>
          a.id === action.id ? { ...a, triggered: action.triggered } : a
        ),
      };

    default:
      return state;
  }
}
