import { colors } from "../styles/tokens.js";
import { QUICK_PICKS } from "../data/currencyNames.js";
import CurrencyPicker from "./CurrencyPicker.jsx";

/** "CONVERT TO" panel — searchable combobox + favorites-aware quick-pick chips. */
export default function CurrencySelect({
  rates,
  target,
  onChange,
  excludeCode,
  favorites,
  onToggleFavorite,
}) {
  // Favorites lead the chip row (deduped), quick picks fill the rest.
  const chips = [...new Set([...(favorites || []), ...QUICK_PICKS])]
    .filter((c) => c !== excludeCode)
    .slice(0, 10);

  return (
    <div
      style={{
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 20,
        marginTop: 10,
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
        CONVERT TO
      </label>

      <div style={{ marginTop: 10 }}>
        <CurrencyPicker
          rates={rates}
          value={target}
          onChange={onChange}
          excludeCode={excludeCode}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
        />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {chips.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            title={favorites?.includes(c) ? "Favorite" : undefined}
            style={{
              padding: "5px 10px",
              borderRadius: 999,
              border: "1px solid " + (target === c ? colors.accent : colors.borderAlt),
              background: target === c ? "rgba(201,162,39,0.12)" : "transparent",
              color: target === c ? colors.accent : colors.textSecondary,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {favorites?.includes(c) ? "★ " : ""}
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
