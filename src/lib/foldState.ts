import { Capacitor, registerPlugin } from "@capacitor/core";
import type { PluginListenerHandle } from "@capacitor/core";

// ---------------------------------------------------------------------------
// Real Fold5 hinge-state detection, bridged from Jetpack WindowManager's
// FoldingFeature via the native FoldStatePlugin (see android/app/src/main/
// java/.../FoldStatePlugin.java). This is deliberately beyond what
// src/styles/responsive.css's media queries can express: a Fold5
// half-opened at ~90 degrees in tabletop/flex posture reports the *same*
// viewport dimensions as fully unfolded flat, so distinguishing them
// requires the platform's actual hinge-angle sensor, not just CSS.
//
// Only meaningful inside the Capacitor Android shell -- there is no web
// equivalent, so every function here degrades to a safe "no fold" default
// in a plain browser/PWA context (or on iOS, or anywhere the plugin isn't
// registered), rather than throwing.
// ---------------------------------------------------------------------------

export type HingeState = "FLAT" | "HALF_OPENED";
export type HingeOrientation = "HORIZONTAL" | "VERTICAL";

export interface HingeBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FoldState {
  hasFold: boolean;
  state: HingeState;
  orientation: HingeOrientation;
  isSeparating: boolean;
  bounds?: HingeBounds;
}

interface FoldStateNativePlugin {
  getFoldState(): Promise<FoldState>;
  addListener(
    eventName: "foldStateChanged",
    listenerFunc: (state: FoldState) => void
  ): Promise<PluginListenerHandle>;
}

export const DEFAULT_FOLD_STATE: FoldState = {
  hasFold: false,
  state: "FLAT",
  orientation: "VERTICAL",
  isSeparating: false,
};

const FoldStateNative = registerPlugin<FoldStateNativePlugin>("FoldState");

/** True only when running inside the Capacitor Android shell -- the
 *  FoldState plugin doesn't exist in a plain browser/PWA context. */
export function isNativeFoldCapable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** One-shot read of the current hinge state. Never throws -- resolves to
 *  DEFAULT_FOLD_STATE (no fold) if the plugin is unavailable or the call
 *  fails for any reason. */
export async function getFoldState(): Promise<FoldState> {
  if (!isNativeFoldCapable()) return DEFAULT_FOLD_STATE;
  try {
    return await FoldStateNative.getFoldState();
  } catch {
    return DEFAULT_FOLD_STATE;
  }
}

/** Subscribes to live hinge-state changes. Returns an unsubscribe
 *  function, always safe to call even if the subscription never
 *  actually attached (e.g. running outside the native shell). */
export function onFoldStateChanged(callback: (state: FoldState) => void): () => void {
  if (!isNativeFoldCapable()) return () => {};
  let handle: PluginListenerHandle | null = null;
  let cancelled = false;
  FoldStateNative.addListener("foldStateChanged", callback)
    .then((h) => {
      if (cancelled) {
        h.remove();
      } else {
        handle = h;
      }
    })
    .catch(() => {
      // Plugin not available at runtime for some reason -- caller just
      // never hears about fold changes, same as the non-native case.
    });
  return () => {
    cancelled = true;
    handle?.remove();
  };
}

/** True when the device is in "flex mode" / tabletop posture -- half
 *  opened with a horizontal hinge, the Fold5's book-style hinge as it's
 *  actually used propped up on a table. This is the state the flex-mode
 *  layout (src/styles/responsive.css `.eb-container.flex-mode`) targets. */
export function isFlexMode(state: FoldState): boolean {
  return state.hasFold && state.state === "HALF_OPENED" && state.orientation === "HORIZONTAL";
}
