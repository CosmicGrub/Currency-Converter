import { useMemo, useState } from "react";
import { colors, fonts } from "../styles/tokens.js";
import { CURRENCY_NAMES } from "../data/currencyNames.js";
import { applyMarkup, convertAmount } from "../lib/convert.js";
import { fmt } from "../lib/format.js";
import type { RateTable } from "../types/index.js";

export interface BasketProps {
  rates: RateTable | null;
  base: string;
  amount: string;
  codes: string[];
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
  /** Fee/markup percentage applied to every basket conversion, matching the
   *  AmountPanel fee calculator setting -- 0 means the raw live rate. */
  markupPct?: number;
}

/** Multi-currency basket — convert the same amount into several currencies
 *  at once, e.g. to compare payout options or plan a multi-country trip. */
export default function Basket({
  rates,
  base,
  amount,
  codes,
  onAdd,
  onRemove,
  markupPct = 0,
}: BasketProps) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  const numericAmount = parseFloat(amount);

  const options = useMemo(() => {
    if (!rates) return [];
    const q = search.trim().toLowerCase();
    return Object.keys(rates)
      .filter((c) => c !== base && !codes.includes(c))
      .filter(
        (c) =>
          !q ||
          c.toLowerCase().includes(q) ||
          (CURRENCY_NAMES[c] || "").toLowerCase().includes(q)
      )
      .sort((a, b) => (CURRENCY_NAMES[a] || a).localeCompare(CURRENCY_NAMES[b] || b))
      .slice(0, 40);
  }, [rates, base, codes, search]);

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
          BASKET
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
          {adding ? "Cancel" : "+ Add currency"}
        </button>
      </div>

      {adding && (
        <div style={{ marginTop: 10 }}>
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search currency or code…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${colors.borderAlt}`,
              background: colors.bg,
              color: colors.textPrimary,
              outline: "none",
              fontSize: 14,
            }}
          />
          <div style={{ maxHeight: 200, overflowY: "auto", marginTop: 6 }}>
            {options.map((c) => (
              <div
                key={c}
                onClick={() => {
                  onAdd(c);
                  setSearch("");
                  setAdding(false);
                }}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = colors.panelAlt)}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>{CURRENCY_NAMES[c] || "Unlisted currency"}</span>
                <span style={{ color: colors.accent, fontWeight: 700 }}>{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {codes.length === 0 ? (
        <p style={{ color: colors.textTertiary, fontSize: 13, marginTop: 10, marginBottom: 0 }}>
          Add currencies to see the same amount converted into all of them at once.
        </p>
      ) : (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          {codes.map((c) => {
            const rawConverted = rates ? convertAmount(numericAmount, rates, base, c) : null;
            const converted = rawConverted !== null ? applyMarkup(rawConverted, markupPct) : null;
            return (
              <div
                key={c}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: colors.panelAlt,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontSize: 13, color: colors.textSecondary }}>
                  {CURRENCY_NAMES[c] || c} <span style={{ color: colors.accent }}>({c})</span>
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 700 }}>
                    {converted !== null ? fmt(converted, c) : "—"}
                  </span>
                  <button
                    onClick={() => onRemove(c)}
                    aria-label={`Remove ${c} from basket`}
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
