import type { AppPrefs } from "../types/index.js";

// ---------------------------------------------------------------------------
// Typed reducer for the persisted preference slice of app state (base,
// target, favorites, basket). Isolating these five actions keeps every
// mutation of `prefs` explicit and exhaustively typed, instead of the
// ad-hoc setPrefs(p => ({ ...p, ... })) callbacks this replaces.
// ---------------------------------------------------------------------------
export type PrefsAction =
  | { type: "SET_BASE"; code: string }
  | { type: "SET_TARGET"; code: string }
  | { type: "SWAP_PAIR" }
  | { type: "TOGGLE_FAVORITE"; code: string }
  | { type: "UPDATE_BASKET"; basket: string[] };

export const defaultPrefs: AppPrefs = { base: "USD", target: "EUR", favorites: [], basket: [] };

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
    default:
      return state;
  }
}
