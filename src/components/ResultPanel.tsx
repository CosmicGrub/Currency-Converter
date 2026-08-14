import { colors, fonts } from "../styles/tokens.js";
import { fmt, rawNum } from "../lib/format.js";
import type { Status } from "../types/index.js";

export interface ResultPanelProps {
  status: Status;
  amount: string;
  base: string;
  target: string;
  rate: number | null;
  converted: number | null;
  stale: boolean;
  asOf: string | null;
  onRetry: () => void;
}

/** Live "X EQUALS" result panel — handles loading/error/ready states, and a
 *  "stale/offline" badge when showing a cached rate table instead of a fresh fetch. */
export default function ResultPanel({
  status,
  amount,
  base,
  target,
  rate,
  converted,
  stale,
  onRetry,
}: ResultPanelProps) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #16233D 0%, #101A2E 100%)",
        border: `1px solid ${colors.borderAlt}`,
        borderRadius: 14,
        padding: 22,
        textAlign: "center",
      }}
    >
      {status === "loading" && (
        <p style={{ color: colors.textSecondary, fontSize: 14 }}>
          Fetching live exchange rates…
        </p>
      )}
      {status === "error" && (
        <div>
          <p style={{ color: colors.error, fontSize: 14, marginBottom: 10 }}>
            Couldn't reach the rates service, and no cached rates are available.
          </p>
          <button
            onClick={onRetry}
            style={{
              background: colors.accent,
              color: colors.bg,
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}
      {status === "ready" && converted !== null && rate !== null && (
        <div key={base + target + amount} style={{ animation: "flipIn 0.18s ease-out" }}>
          {stale && (
            <div
              style={{
                display: "inline-block",
                fontSize: 10,
                letterSpacing: "0.08em",
                fontWeight: 700,
                color: colors.error,
                border: `1px solid ${colors.error}`,
                borderRadius: 999,
                padding: "2px 8px",
                marginBottom: 10,
              }}
            >
              OFFLINE — SHOWING CACHED RATES
            </div>
          )}
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.1em",
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            {amount || 0} {base} EQUALS
          </div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 40,
              fontWeight: 700,
              color: colors.textPrimary,
              wordBreak: "break-word",
            }}
          >
            {rawNum(converted)} <span style={{ fontSize: 20, color: colors.accent }}>{target}</span>
          </div>
          <div style={{ color: colors.textSecondary, fontSize: 13, marginTop: 10 }}>
            1 {base} = {fmt(rate, target)}
          </div>
        </div>
      )}
      {status === "ready" && converted === null && (
        <p style={{ color: colors.textSecondary, fontSize: 14 }}>
          Enter an amount to see the conversion.
        </p>
      )}
    </div>
  );
}
