import { colors, fonts } from "../styles/tokens.js";
import CurrencyPicker from "./CurrencyPicker.js";
import type { RateTable } from "../types/index.js";

export interface AmountPanelProps {
  amount: string;
  onAmountChange: (amount: string) => void;
  base: string;
  onBaseChange: (code: string) => void;
  rates: RateTable | null;
  excludeCode: string;
  favorites: string[];
  onToggleFavorite: (code: string) => void;
  markupPct: number;
  onMarkupChange: (pct: number) => void;
}

/** Fee/markup presets a money-transfer or card provider might apply on top
 *  of the live mid-market rate -- 0 means "show the raw live rate". */
export const MARKUP_OPTIONS: { pct: number; label: string }[] = [
  { pct: 0, label: "0%" },
  { pct: 0.005, label: "+0.5%" },
  { pct: 0.015, label: "+1.5%" },
  { pct: 0.03, label: "+3%" },
];

/** "YOU HAVE" panel — amount input + the "from" currency (any currency, not
 *  just USD, now that conversion is base-agnostic) + an optional fee/markup
 *  adjustment applied to the live rate everywhere else in the app. */
export default function AmountPanel({
  amount,
  onAmountChange,
  base,
  onBaseChange,
  rates,
  excludeCode,
  favorites,
  onToggleFavorite,
  markupPct,
  onMarkupChange,
}: AmountPanelProps) {
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

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${colors.border}` }}>
        <label
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            color: colors.textTertiary,
            fontWeight: 600,
          }}
        >
          FEE / MARKUP
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {MARKUP_OPTIONS.map(({ pct, label }) => (
            <button
              key={pct}
              onClick={() => onMarkupChange(pct)}
              title={
                pct === 0
                  ? "Live mid-market rate, no fee"
                  : `Simulate a ${label} markup on the live rate`
              }
              style={{
                padding: "4px 9px",
                borderRadius: 999,
                border: "1px solid " + (markupPct === pct ? colors.accent : colors.borderAlt),
                background: markupPct === pct ? "rgba(201,162,39,0.12)" : "transparent",
                color: markupPct === pct ? colors.accent : colors.textSecondary,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
