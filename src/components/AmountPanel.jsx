import { colors, fonts } from "../styles/tokens.js";
import CurrencyPicker from "./CurrencyPicker.jsx";

/** "YOU HAVE" panel — amount input + the "from" currency (any currency, not
 *  just USD, now that conversion is base-agnostic). */
export default function AmountPanel({
  amount,
  onAmountChange,
  base,
  onBaseChange,
  rates,
  excludeCode,
  favorites,
  onToggleFavorite,
}) {
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
        <input
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
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
        <CurrencyPicker
          compact
          rates={rates}
          value={base}
          onChange={onBaseChange}
          excludeCode={excludeCode}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    </div>
  );
}
