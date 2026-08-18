import { useMemo, useState } from "react";
import { colors, fonts } from "../styles/tokens.js";
import { CURRENCY_NAMES } from "../data/currencyNames.js";
import { applyMarkup, convertAmount } from "../lib/convert.js";
import { fmt } from "../lib/format.js";
import type { BasketPreset, RateTable } from "../types/index.js";

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
  /** Named saved snapshots of the basket -- "Europe trip", "Crypto watch",
   *  etc. Save/load/delete a whole basket's contents at once. Optional so
   *  Basket keeps working unchanged if a caller doesn't wire presets up.
   *  onSavePreset takes just the name -- the caller (App.tsx, via the
   *  reducer) is the single source of truth for *which* codes get saved,
   *  reading its own current `basket` state rather than trusting a
   *  `codes` snapshot passed back up through this component. */
  presets?: BasketPreset[];
  onSavePreset?: (name: string) => void;
  onLoadPreset?: (id: string) => void;
  onDeletePreset?: (id: string) => void;
}

/** Multi-currency basket — convert the same amount into several currencies
 *  at once, e.g. to compare payout options or plan a multi-country trip.
 *  Optionally backed by named presets so a whole basket can be saved and
 *  swapped back in later. */
export default function Basket({
  rates,
  base,
  amount,
  codes,
  onAdd,
  onRemove,
  markupPct = 0,
  presets = [],
  onSavePreset,
  onLoadPreset,
  onDeletePreset,
}: BasketProps) {
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [namingPreset, setNamingPreset] = useState(false);
  const [presetName, setPresetName] = useState("");

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <label
          style={{ fontSize: 11, letterSpacing: "0.1em", color: colors.textSecondary, fontWeight: 600 }}
        >
          BASKET
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          {onSavePreset && codes.length > 0 && (
            <button
              onClick={() => setNamingPreset((n) => !n)}
              style={{
                background: "transparent",
                border: `1px solid ${colors.borderAlt}`,
                borderRadius: 999,
                padding: "4px 10px",
                color: colors.textSecondary,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {namingPreset ? "Cancel" : "Save as preset"}
            </button>
          )}
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
      </div>

      {namingPreset && onSavePreset && (
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <input
            autoFocus
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name, e.g. Europe trip"
            style={{
              flex: 1,
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
          <button
            onClick={() => {
              const name = presetName.trim();
              if (!name) return;
              onSavePreset(name);
              setPresetName("");
              setNamingPreset(false);
            }}
            disabled={!presetName.trim()}
            style={{
              background: colors.accent,
              color: colors.bg,
              border: "none",
              borderRadius: 8,
              padding: "0 14px",
              fontWeight: 700,
              fontSize: 13,
              cursor: presetName.trim() ? "pointer" : "not-allowed",
              opacity: presetName.trim() ? 1 : 0.5,
            }}
          >
            Save
          </button>
        </div>
      )}

      {presets.length > 0 && (onLoadPreset || onDeletePreset) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {presets.map((preset) => (
            <div
              key={preset.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px 4px 10px",
                borderRadius: 999,
                border: `1px solid ${colors.borderAlt}`,
                background: "transparent",
              }}
            >
              <button
                onClick={() => onLoadPreset?.(preset.id)}
                title={`Load "${preset.name}" (${preset.codes.length} currencies)`}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {preset.name}
              </button>
              {onDeletePreset && (
                <button
                  onClick={() => onDeletePreset(preset.id)}
                  aria-label={`Delete preset ${preset.name}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: colors.textTertiary,
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

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
