// ---------------------------------------------------------------------------
// Thin, defensive wrapper around the browser Notification API for rate
// alerts. This is a bonus channel, not the source of truth -- the Alerts
// panel itself always shows each alert's live status regardless of
// permission state, so a user who denies (or never grants) notification
// permission still sees triggered alerts the moment they have the app
// open. Every function here is a no-op (never throws) if Notification
// isn't supported/available, e.g. in the CLI, tests, or older browsers.
// ---------------------------------------------------------------------------

function notificationSupported(): boolean {
  return typeof Notification !== "undefined";
}

/** Requests permission once, if the user hasn't already been asked
 *  (i.e. permission is still in its default/unset state). Safe to call
 *  on every mount -- it's a no-op once permission has been granted or
 *  denied. */
export function requestNotificationPermission(): void {
  if (!notificationSupported()) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {
      // Some browsers reject the promise instead of resolving "denied" --
      // either way, the in-app Alerts panel remains the reliable channel.
    });
  }
}

/** Fires a browser notification if permission has been granted; silently
 *  does nothing otherwise (denied, unsupported, or construction fails --
 *  some mobile browsers require a service-worker-driven notification
 *  instead of the plain constructor used here). */
export function notify(title: string, body: string): void {
  if (!notificationSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icon.svg" });
  } catch {
    // Fail silently -- the in-app Alerts panel still shows the alert.
  }
}
