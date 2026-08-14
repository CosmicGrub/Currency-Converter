import { useEffect, useState } from "react";
import { colors, fonts } from "../styles/tokens.js";
import { fetchHistory } from "../lib/history.js";
import type { HistoryPoint, Timeframe } from "../types/index.js";

const WIDTH = 560;
const HEIGHT = 100;
const PAD = 8;

/** Timeframe -> days-back, passed straight through to the frankfurter.dev
 *  `{start}..{end}` date-range endpoint params (see lib/history.ts). */
const TIMEFRAME_DAYS: Record<Timeframe, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
};
const TIMEFRAMES: Timeframe[] = ["7D", "30D", "90D", "1Y"];

function buildPath(points: HistoryPoint[]): string {
  if (points.length < 2) return "";
  const values = points.map((p) => p.rate);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = (WIDTH - PAD * 2) / (points.length - 1);

  return points
    .map((p, i) => {
      const x = PAD + i * stepX;
      const y = HEIGHT - PAD - ((p.rate - min) / span) * (HEIGHT - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export interface HistoryChartProps {
  base: string;
  target: string;
}

/** Sparkline trend chart for the base -> target rate, with a selectable
 *  7D/30D/90D/1Y timeframe. Silently renders nothing but a note if the pair
 *  isn't covered by the historical data source — that's an expected
 *  outcome for exotic currencies, not an error. */
export default function HistoryChart({ base, target }: HistoryChartProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("30D");
  const [points, setPoints] = useState<HistoryPoint[] | null>(null); // null = loading, [] = unavailable

  useEffect(() => {
    if (base === target) {
      setPoints([]);
      return;
    }
    setPoints(null);
    let cancelled = false;
    const controller = new AbortController();
    fetchHistory(base, target, { days: TIMEFRAME_DAYS[timeframe], signal: controller.signal })
      .then((result) => {
        if (!cancelled) setPoints(result);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [base, target, timeframe]);

  const timeframeSwitcher = (
    <div style={{ display: "flex", gap: 4 }}>
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => setTimeframe(tf)}
          style={{
            padding: "3px 8px",
            borderRadius: 6,
            border: "1px solid " + (timeframe === tf ? colors.accent : colors.borderAlt),
            background: timeframe === tf ? "rgba(201,162,39,0.12)" : "transparent",
            color: timeframe === tf ? colors.accent : colors.textSecondary,
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {tf}
        </button>
      ))}
    </div>
  );

  if (points === null) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: colors.textTertiary,
          fontSize: 12,
          marginTop: 16,
        }}
      >
        <span>Loading {timeframe} trend…</span>
        {timeframeSwitcher}
      </div>
    );
  }
  if (points.length < 2) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: colors.textTertiary,
          fontSize: 12,
          marginTop: 16,
        }}
      >
        <span>
          {timeframe} trend unavailable for {base}/{target}.
        </span>
        {timeframeSwitcher}
      </div>
    );
  }

  const first = points[0].rate;
  const last = points[points.length - 1].rate;
  const change = ((last - first) / first) * 100;
  const trendColor = change >= 0 ? "#4CAF7D" : colors.error;

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
          {timeframe} TREND — {base}/{target}
        </label>
        <span style={{ fontFamily: fonts.mono, fontSize: 12, color: trendColor, fontWeight: 700 }}>
          {change >= 0 ? "▲" : "▼"} {Math.abs(change).toFixed(2)}%
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: 80, marginTop: 10, display: "block" }}
        preserveAspectRatio="none"
      >
        <path d={buildPath(points)} fill="none" stroke={colors.accent} strokeWidth="2" />
      </svg>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: colors.textTertiary,
          fontSize: 11,
          marginTop: 4,
        }}
      >
        <span>{points[0].date}</span>
        {timeframeSwitcher}
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}
