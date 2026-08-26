import { Capacitor, registerPlugin } from "@capacitor/core";
import type { RateAlert } from "../types/index.js";

// ---------------------------------------------------------------------------
// Bridges the JS-side alert list to a native background check
// (android/app/src/main/java/.../RateAlertsScheduler.java +
// RateAlertsWorker.java, via the BackgroundAlertsPlugin), so a threshold
// crossing still fires a system notification with the app/WebView fully
// closed -- see docs/FEATURE_ALERTS_AND_PRESETS.md for the foreground-only
// scope this closes. Only meaningful inside the Capacitor Android shell --
// every function here degrades to a safe no-op in a plain browser/PWA
// context (or iOS, or anywhere the plugin isn't registered), the same
// pattern src/lib/foldState.ts uses for the Fold5 hinge-state bridge.
// ---------------------------------------------------------------------------

interface BackgroundAlertsNativePlugin {
  syncAlerts(options: { alerts: RateAlert[] }): Promise<void>;
  requestPermission(): Promise<{ granted: boolean }>;
  checkPermission(): Promise<{ granted: boolean }>;
}

const BackgroundAlertsNative = registerPlugin<BackgroundAlertsNativePlugin>("BackgroundAlerts");

/** True only when running inside the Capacitor Android shell -- the
 *  BackgroundAlerts plugin doesn't exist in a plain browser/PWA context. */
export function isNativeBackgroundAlertsCapable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}

/** Pushes the current alert list to the native side so RateAlertsWorker's
 *  next scheduled run checks the same thresholds this session has set --
 *  call this whenever the `alerts` array changes (add/remove/toggle).
 *  Never throws -- a no-op outside the native Android shell, and a failed
 *  native call is swallowed since the foreground panel remains the
 *  reliable channel either way. */
export async function syncBackgroundAlerts(alerts: RateAlert[]): Promise<void> {
  if (!isNativeBackgroundAlertsCapable()) return;
  try {
    await BackgroundAlertsNative.syncAlerts({ alerts });
  } catch {
    // Background sync is a bonus channel -- the foreground Alerts panel
    // still works even if the native bridge call failed for some reason.
  }
}

/** Requests the runtime POST_NOTIFICATIONS permission (Android 13+ only --
 *  a no-op resolving `true` below that, and outside the native shell).
 *  Safe to call on every mount, same as requestNotificationPermission()
 *  in lib/notify.ts for the browser Notification API. */
export async function requestBackgroundAlertsPermission(): Promise<boolean> {
  if (!isNativeBackgroundAlertsCapable()) return true;
  try {
    const { granted } = await BackgroundAlertsNative.requestPermission();
    return granted;
  } catch {
    return false;
  }
}
