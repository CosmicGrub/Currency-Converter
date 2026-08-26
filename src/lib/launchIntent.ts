// ---------------------------------------------------------------------------
// App-shortcut / deep-link handling: the launcher long-press shortcuts
// declared in android/app/src/main/res/xml/shortcuts.xml each launch
// MainActivity with an explicit Intent whose `data` is a
// `<custom_url_scheme>://convert?base=X&target=Y` URI (see
// AndroidManifest.xml's meta-data android.app.shortcuts entry). @capacitor/
// app's `appUrlOpen` event (warm start) and `getLaunchUrl()` (cold start)
// both hand that same URL string to JS -- this file just parses it.
//
// Deliberately pure/URL-parsing only, no Capacitor import here, so it's
// trivially unit-testable; the hook that actually calls into
// @capacitor/app lives in src/hooks/useLaunchShortcut.ts, mirroring how
// lib/foldState.ts (native bridge) vs hooks/useFoldState.ts (React wiring)
// are split.
// ---------------------------------------------------------------------------

export interface ConvertIntent {
  base: string;
  target: string;
}

/** Parses a `scheme://convert?base=EUR&target=USD`-shaped URL into
 *  {base, target} (both upper-cased), or null if it doesn't match --
 *  any malformed/foreign URL (including a plain http(s) link, which
 *  `getLaunchUrl()` can also legitimately return) is just ignored rather
 *  than treated as an error. */
export function parseConvertIntent(url: string | null | undefined): ConvertIntent | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  // scheme://convert?... parses with host "convert" for a custom scheme
  // (no "authority" concept to disambiguate path vs host the way http(s)
  // does), so accept either host==="convert" or a leading "/convert" path.
  const isConvert = parsed.hostname === "convert" || parsed.pathname.replace(/^\/+/, "") === "convert";
  if (!isConvert) return null;

  const base = parsed.searchParams.get("base");
  const target = parsed.searchParams.get("target");
  if (!base || !target) return null;

  return { base: base.toUpperCase(), target: target.toUpperCase() };
}
