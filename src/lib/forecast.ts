import type { HistoryPoint } from "../types/index.js";

// ---------------------------------------------------------------------------
// Rudimentary, fully on-device trend analysis over historical rate data --
// ordinary least-squares linear regression, a moving average, and a
// volatility (residual standard deviation) measure. This is genuinely a
// simple statistical *learning* method (fitting a model's parameters to
// observed data), just not a neural network -- and it costs nothing: no
// external API, no server, pure arithmetic over data already fetched for
// the trend chart (see lib/history.ts). Never sent anywhere, works offline
// once the underlying history is cached.
//
// Explicitly NOT a financial prediction tool -- see the disclaimer baked
// into buildForecast()'s insight text. A straight line fit to 30 days of
// noisy FX data is a rough trend summary, not a forecast anyone should
// trade on.
// ---------------------------------------------------------------------------

export interface Forecast {
  slopePerStep: number;
  intercept: number;
  movingAverage: number | null;
  volatility: number;
  trend: "rising" | "falling" | "flat";
  projectedNext: number | null;
  insight: string;
}

/** Ordinary least-squares fit of rate over point index (0, 1, 2, ...). */
export function linearRegression(points: HistoryPoint[]): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].rate };

  const xMean = (n - 1) / 2;
  const yMean = points.reduce((sum, p) => sum + p.rate, 0) / n;

  let num = 0;
  let den = 0;
  points.forEach((p, i) => {
    num += (i - xMean) * (p.rate - yMean);
    den += (i - xMean) ** 2;
  });

  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

/** Mean of the last `window` points (or all of them if fewer). */
export function movingAverage(points: HistoryPoint[], window: number): number | null {
  if (points.length === 0) return null;
  const slice = points.slice(-window);
  return slice.reduce((sum, p) => sum + p.rate, 0) / slice.length;
}

/** Standard deviation of the regression residuals -- a simple volatility
 *  measure in the series' own units (e.g. rate points, not percent). */
export function volatility(points: HistoryPoint[], slope: number, intercept: number): number {
  const n = points.length;
  if (n < 2) return 0;
  const residuals = points.map((p, i) => p.rate - (intercept + slope * i));
  const mean = residuals.reduce((sum, r) => sum + r, 0) / n;
  const variance = residuals.reduce((sum, r) => sum + (r - mean) ** 2, 0) / n;
  return Math.sqrt(variance);
}

const FLAT_THRESHOLD_PCT_PER_STEP = 0.05;

/** Builds a full forecast summary for a base/target pair's historical
 *  series, or null if there isn't enough data (fewer than 3 points, or
 *  the series is otherwise degenerate) to say anything meaningful. */
export function buildForecast(
  points: HistoryPoint[],
  base: string,
  target: string
): Forecast | null {
  if (points.length < 3) return null;

  const { slope, intercept } = linearRegression(points);
  const vol = volatility(points, slope, intercept);
  const window = Math.min(points.length, 7);
  const ma = movingAverage(points, window);
  const last = points[points.length - 1].rate;
  const projectedNext = intercept + slope * points.length;

  // Normalize the slope to "% per step" relative to the series' own scale
  // so the flat/rising/falling threshold means the same thing whether the
  // pair trades around 0.9 (EUR) or 150 (JPY).
  const pctSlopePerStep = last !== 0 ? (slope / last) * 100 : 0;
  const trend: Forecast["trend"] =
    pctSlopePerStep > FLAT_THRESHOLD_PCT_PER_STEP
      ? "rising"
      : pctSlopePerStep < -FLAT_THRESHOLD_PCT_PER_STEP
        ? "falling"
        : "flat";

  const trendWord =
    trend === "rising" ? "strengthening" : trend === "falling" ? "weakening" : "holding roughly steady";
  const vsAvg = ma === null ? null : last > ma ? "above" : last < ma ? "below" : "at";

  const insight =
    `${base}/${target} has been ${trendWord} over this window` +
    (vsAvg !== null && ma !== null
      ? `, currently ${vsAvg} its ${window}-point average (${ma.toFixed(4)}).`
      : ".") +
    (vol > 0 ? ` Recent volatility: ±${vol.toFixed(4)}.` : "") +
    " On-device linear trend only -- not a financial forecast.";

  return { slopePerStep: slope, intercept, movingAverage: ma, volatility: vol, trend, projectedNext, insight };
}
