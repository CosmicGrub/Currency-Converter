import { useEffect, useState } from "react";
import { colors, fonts } from "../styles/tokens.js";
import { fetchHistory } from "../lib/history.js";

const WIDTH = 560;
const HEIGHT = 100;
const PAD = 8;

function buildPath(points) {
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

/** 30-day sparkline of the base -> target rate. Silently renders nothing if
 *  the pair isn't covered by the historical data source — that's an
 *  expected outcome for exotic currencies, not an error. */
export default function HistoryChart({ base, target }) {
  const [points, setPoints] = useState(null); // null = loading, [] = unavailable

  useEffect(() => {
    if (base === target) {
      setPoints([]);
      return;
    }
    setPoints(null);
    let cancelled = false;
    const controller = new AbortController();
    fetchHistory(base, target, { signal: controller.signal })
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
  }, [base, target]);

  if (points === null) {
    return (
      <div style={{ color: colors.textTertiary, fontSize: 12, marginTop: 16 }}>
        Loading 30-day trend…
      </div>
    );
  }
  if (points.length < 2) {
    return (
      <div style={{ color: colors.textTertiary, fontSize: 12, marginTop: 16 }}>
        30-day trend unavailable for {base}/{target}.
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
          30-DAY TREND — {base}/{target}
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
          color: colors.textTertiary,
          fontSize: 11,
          marginTop: 4,
        }}
      >
        <span>{points[0].date}</span>
        <span>{points[points.length - 1].date}</span>
      </div>
    </div>
  );
}
