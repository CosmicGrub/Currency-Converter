import { rateBetween } from "./convert.js";
import type { RateAlert, RateTable } from "../types/index.js";

// ---------------------------------------------------------------------------
// Pure threshold-crossing logic for rate alerts, kept separate from the
// Alerts component so it's trivially testable without rendering anything.
// ---------------------------------------------------------------------------

/** The live rate for an alert's base/target pair, or null if the rate
 *  table isn't loaded or the pair can't be resolved. */
export function currentAlertRate(alert: RateAlert, rates: RateTable | null): number | null {
  if (!rates) return null;
  return rateBetween(rates, alert.base, alert.target);
}

/** True if `rate` is on the "armed/triggered" side of the alert's
 *  threshold -- independent of the alert's own `triggered` flag. Callers
 *  compare this against `alert.triggered` to detect a *transition*
 *  (armed -> triggered fires a notification; triggered -> armed silently
 *  re-arms) rather than notifying on every check while the condition
 *  simply remains true. */
export function isThresholdCrossed(alert: RateAlert, rate: number | null): boolean {
  if (rate === null) return false;
  return alert.direction === "above" ? rate >= alert.threshold : rate <= alert.threshold;
}
