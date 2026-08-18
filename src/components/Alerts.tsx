import { useEffect, useState } from "react";
import { colors, fonts } from "../styles/tokens.js";
import { CURRENCY_NAMES } from "../data/currencyNames.js";
import { currentAlertRate, isThresholdCrossed } from "../lib/alerts.js";
import { genId } from "../lib/id.js";
import { notify, requestNotificationPermission } from "../lib/notify.js";
import type { AlertDirection, RateAlert, RateTable } from "../types/index.js";

export interface AlertsProps {
  rates: RateTable | null;
  base: string;
  target: string;
  alerts: RateAlert[];
  onAdd: (alert: RateAlert) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onMarkTriggered: (id: string, triggered: boolean) => void;
}

/** Threshold-based rate alerts -- "notify when 1 BASE = TARGET goes above
 *  or below X". Scoped deliberately as foreground/open-app alerts: this
 *  panel re-checks every enabled alert whenever `rates` changes (App.tsx
 *  refreshes periodically while any alert is enabled) and always shows
 *  each alert's live status here, regardless of whether the browser
 *  Notification permission was granted -- the in-app status is the
 *  reliable channel, the system notification is a bonus for when the tab
 *  isn't focused. This is *not* a guaranteed background push when the
 *  app/browser is fully closed -- that would need a native background
 *  job (see docs) and hasn't been built. */
export default function Alerts({
  rates,
  base,
  target,
  alerts,
  onAdd,
  onRemove,
  onToggle,
  onMarkTriggered,
}: AlertsProps) {
  const [adding, setAdding] = useState(false);
  const [direction, setDirection] = useState<AlertDirection>("above");
  const [threshold, setThreshold] = useState("");

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Re-evaluate every enabled alert whenever the rate table changes.
  useEffect(() => {
    if (!rates) return;
    for (const alert of alerts) {
      if (!alert.enabled) continue;
      const rate = currentAlertRate(alert, rates);
      const crossed = isThresholdCrossed(alert, rate);
      if (crossed && !alert.triggered) {
        onMarkTriggered(alert.id, true);
        notify(
          "ExchangeBoard rate alert",
          `1 ${alert.base} = ${rate?.toFixed(4)} ${alert.target} (${alert.direction} ${alert.threshold})`
        );
      } else if (!crossed && alert.triggered) {
        onMarkTriggered(alert.id, false); // silently re-arm, no notification
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  const addAlert = () => {
    const value = parseFloat(threshold);
    if (!isFinite(value)) return;
    onAdd({
      id: genId(),
      base,
      target,
      direction,
      threshold: value,
      enabled: true,
      triggered: false,
    });
    setThreshold("");
    setAdding(false);
  };

  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 20,
        marginTop: 16,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label
          style={{ fontSize: 11, letterSpacing: "0.1em", color: colors.textSecondary, fontWeight: 600 }}
        >
          RATE ALERTS
        </label>
        <button
          onClick={() => setAdding((a) => !a)}
          style={{
            background: "transparent",
            border: `1px solid ${colors.borderAlt}`,
            borderRadius: 999,
            padding: "4px 10px",
            color: colors.accent,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {adding ? "Cancel" : "+ Add alert"}
        </button>
      </div>

      {adding && (
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: colors.textSecondary }}>
            1 {base} =
          </span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as AlertDirection)}
            style={{
              background: colors.panelAlt,
              border: `1px solid ${colors.borderAlt}`,
              borderRadius: 8,
              color: colors.textPrimary,
              padding: "6px 8px",
              fontSize: 13,
            }}
          >
            <option value="above">goes above</option>
            <option value="below">goes below</option>
          </select>
          <input
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            type="number"
            inputMode="decimal"
            placeholder={`e.g. 0.90`}
            style={{
              width: 100,
              background: colors.panelAlt,
              border: `1px solid ${colors.borderAlt}`,
              borderRadius: 8,
              color: colors.textPrimary,
              padding: "6px 8px",
              fontSize: 13,
              fontFamily: fonts.mono,
            }}
          />
          <span style={{ fontSize: 13, color: colors.textSecondary }}>{target}</span>
          <button
            onClick={addAlert}
            disabled={!threshold}
            style={{
              background: colors.accent,
              color: colors.bg,
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              fontWeight: 700,
              fontSize: 13,
              cursor: threshold ? "pointer" : "not-allowed",
              opacity: threshold ? 1 : 0.5,
            }}
          >
            Add
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <p style={{ color: colors.textTertiary, fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          Set a threshold on any pair and get notified (in-app, and via a
          browser notification if allowed) when the live rate crosses it.
        </p>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((alert) => {
            const rate = currentAlertRate(alert, rates);
            const armed = alert.enabled && isThresholdCrossed(alert, rate);
            return (
              <div
                key={alert.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: colors.panelAlt,
                  borderRadius: 8,
                  opacity: alert.enabled ? 1 : 0.5,
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontFamily: fonts.mono }}>
                    {alert.base}/{alert.target} {alert.direction} {alert.threshold}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
                    {CURRENCY_NAMES[alert.base] || alert.base} → {CURRENCY_NAMES[alert.target] || alert.target}
                    {rate !== null && ` · now ${rate.toFixed(4)}`}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {armed && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: colors.accent }}>🔔 Triggered</span>
                  )}
                  <button
                    onClick={() => onToggle(alert.id)}
                    title={alert.enabled ? "Disable alert" : "Enable alert"}
                    style={{
                      background: "transparent",
                      border: `1px solid ${colors.borderAlt}`,
                      borderRadius: 999,
                      padding: "3px 8px",
                      color: colors.textSecondary,
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {alert.enabled ? "On" : "Off"}
                  </button>
                  <button
                    onClick={() => onRemove(alert.id)}
                    aria-label={`Remove ${alert.base}/${alert.target} alert`}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: colors.textTertiary,
                      cursor: "pointer",
                      fontSize: 14,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
