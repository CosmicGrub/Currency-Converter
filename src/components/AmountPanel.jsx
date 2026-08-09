import { colors, fonts } from "../styles/tokens.js";

/** "YOU HAVE" panel — USD amount input. */
export default function AmountPanel({ amount, onChange }) {
  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <label
        style={{
          fontSize: 11,
          letterSpacing: "0.1em",
          color: colors.textSecondary,
          fontWeight: 600,
        }}
      >
        YOU HAVE
      </label>
      <div style={{ display: "flex", alignItems: "center", marginTop: 10, gap: 10 }}>
        <span style={{ fontFamily: fonts.mono, fontSize: 26, color: colors.textSecondary }}>
          $
        </span>
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: colors.textPrimary,
            fontFamily: fonts.mono,
            fontSize: 32,
            fontWeight: 700,
            minWidth: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: colors.textPrimary,
            background: colors.border,
            borderRadius: 999,
            padding: "4px 10px",
            letterSpacing: "0.05em",
          }}
        >
          USD
        </span>
      </div>
    </div>
  );
}
