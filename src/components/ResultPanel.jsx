import { colors, fonts } from "../styles/tokens.js";
import { fmt, rawNum } from "../lib/format.js";

/** Live "1 USD EQUALS" result panel — handles loading/error/ready states. */
export default function ResultPanel({ status, amount, target, rate, converted, onRetry }) {
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
            Couldn't reach the rates service. Check your connection.
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
      {status === "ready" && converted !== null && (
        <div key={target + amount} style={{ animation: "flipIn 0.18s ease-out" }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.1em",
              color: colors.textSecondary,
              marginBottom: 8,
            }}
          >
            {amount || 0} USD EQUALS
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
            1 USD = {fmt(rate, target)}
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
