import { useEffect, useState } from "react";
import { colors, fonts } from "../styles/tokens.js";
import { fetchHistory } from "../lib/history.js";
import { buildForecast } from "../lib/forecast.js";
import type { Forecast } from "../lib/forecast.js";

export interface InsightsProps {
  base: string;
  target: string;
}

const TREND_META: Record<Forecast["trend"], { color: string; arrow: string }> = {
  rising: { color: "#4CAF7D", arrow: "▲" },
  falling: { color: colors.error, arrow: "▼" },
  flat: { color: colors.textSecondary, arrow: "→" },
};

/** On-device "AI" trend insight -- a rudimentary, fully client-side
 *  statistical model (ordinary least-squares regression + moving average
 *  + volatility over the same 30-day history the trend chart fetches),
 *  not a call to any paid or hosted model. Zero cost, zero extra
 *  infrastructure, works offline once the underlying history is cached
 *  (see lib/history.ts / lib/db.ts). Renders nothing for a same-currency
 *  pair or when there isn't enough history to say anything useful --
 *  same "silent when not applicable" convention as HistoryChart/Matrix. */
export default function Insights({ base, target }: InsightsProps) {
  const [forecast, setForecast] = useState<Forecast | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    if (base === target) {
      setForecast(null);
      return;
    }
    setForecast(undefined);
    let cancelled = false;
    fetchHistory(base, target, { days: 30 })
      .then((points) => {
        if (!cancelled) setForecast(buildForecast(points, base, target));
      })
      .catch(() => {
        if (!cancelled) setForecast(null);
      });
    return () => {
      cancelled = true;
    };
  }, [base, target]);

  if (forecast === undefined) {
    return (
      <div style={{ color: colors.textTertiary, fontSize: 12, marginTop: 16 }}>
        Building trend insight…
      </div>
    );
  }
  if (forecast === null) {
    return null;
  }

  const { color: trendColor, arrow: trendArrow } = TREND_META[forecast.trend];

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label
          style={{ fontSize: 11, letterSpacing: "0.1em", color: colors.textSecondary, fontWeight: 600 }}
        >
          TREND INSIGHT (ON-DEVICE)
        </label>
        <span style={{ fontFamily: fonts.mono, fontSize: 12, color: trendColor, fontWeight: 700 }}>
          {trendArrow} {forecast.trend}
        </span>
      </div>
      <p style={{ fontSize: 13, color: colors.textPrimary, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
        {forecast.insight}
      </p>
      {forecast.projectedNext !== null && (
        <div style={{ fontSize: 11, color: colors.textTertiary, marginTop: 8 }}>
          Naive next-point projection: {forecast.projectedNext.toFixed(4)}
        </div>
      )}
    </div>
  );
}
