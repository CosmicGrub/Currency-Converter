import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { parseConvertIntent } from "../lib/launchIntent.js";
import type { ConvertIntent } from "../lib/launchIntent.js";

/** Fires `onIntent` once for a launcher-shortcut deep link, covering both
 *  cold start (app wasn't running -- `App.getLaunchUrl()`) and warm start
 *  (app already running in the background -- the `appUrlOpen` event).
 *  A plain no-op outside the native Android shell (`@capacitor/app`'s
 *  `getLaunchUrl`/`appUrlOpen` only mean anything there), same pattern as
 *  useFoldState. Dynamically imports `@capacitor/app` so a plain web/PWA
 *  build never needs it on the critical path. */
export function useLaunchShortcut(onIntent: (intent: ConvertIntent) => void): void {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    import("@capacitor/app")
      .then(({ App }) => {
        if (cancelled) return;
        App.getLaunchUrl().then((result) => {
          const intent = parseConvertIntent(result?.url);
          if (intent) onIntent(intent);
        });
        App.addListener("appUrlOpen", ({ url }) => {
          const intent = parseConvertIntent(url);
          if (intent) onIntent(intent);
        }).then((handle) => {
          if (cancelled) handle.remove();
          else unsubscribe = () => handle.remove();
        });
      })
      .catch(() => {
        // @capacitor/app not installed/available -- degrade silently,
        // same as any other native-only feature outside the shell.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
    // onIntent is expected to be a stable dispatch-wrapping callback;
    // re-subscribing on every render would be wrong, matching
    // useFoldState's convention (also an empty deps array).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
