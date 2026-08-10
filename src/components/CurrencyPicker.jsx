import { useEffect, useMemo, useRef, useState } from "react";
import { colors } from "../styles/tokens.js";
import { CURRENCY_NAMES } from "../data/currencyNames.js";

/** Searchable currency combobox — the "which currency" control shared by the
 *  amount panel (compact pill) and the full from/to panels. Star icons let
 *  the user favorite a currency; favorites are always sorted to the top. */
export default function CurrencyPicker({
  rates,
  value,
  onChange,
  excludeCode,
  favorites,
  onToggleFavorite,
  compact = false,
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const codes = useMemo(() => {
    if (!rates) return [];
    const all = Object.keys(rates).filter((c) => c !== excludeCode);
    const isFav = (c) => favorites?.includes(c);
    return all.sort((a, b) => {
      const favDiff = Number(isFav(b)) - Number(isFav(a));
      if (favDiff !== 0) return favDiff;
      return (CURRENCY_NAMES[a] || a).localeCompare(CURRENCY_NAMES[b] || b);
    });
  }, [rates, excludeCode, favorites]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (c) =>
        c.toLowerCase().includes(q) ||
        (CURRENCY_NAMES[c] || "").toLowerCase().includes(q)
    );
  }, [codes, search]);

  const select = (c) => {
    onChange(c);
    setOpen(false);
    setSearch("");
  };

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={
          compact
            ? {
                fontSize: 13,
                fontWeight: 700,
                color: colors.textPrimary,
                background: colors.border,
                border: "none",
                borderRadius: 999,
                padding: "4px 10px",
                letterSpacing: "0.05em",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }
            : {
                width: "100%",
                textAlign: "left",
                background: colors.panelAlt,
                border: `1px solid ${colors.borderAlt}`,
                borderRadius: 10,
                padding: "12px 14px",
                color: colors.textPrimary,
                fontSize: 15,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }
        }
      >
        {compact ? (
          value
        ) : (
          <>
            <span>
              {CURRENCY_NAMES[value] || value}{" "}
              <span style={{ color: colors.accent, fontWeight: 700 }}>({value})</span>
            </span>
            <span style={{ color: colors.textSecondary }}>{open ? "▲" : "▼"}</span>
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: compact ? "auto" : 0,
            minWidth: compact ? 260 : undefined,
            background: colors.panelAlt,
            border: `1px solid ${colors.borderAlt}`,
            borderRadius: 10,
            zIndex: 30,
            maxHeight: 320,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search currency or code…"
            style={{
              margin: 10,
              padding: "9px 12px",
              borderRadius: 8,
              border: `1px solid ${colors.borderAlt}`,
              background: colors.bg,
              color: colors.textPrimary,
              outline: "none",
              fontSize: 14,
            }}
          />
          <div style={{ overflowY: "auto", paddingBottom: 6 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 14, color: colors.textSecondary, fontSize: 13 }}>
                No currency matches "{search}".
              </div>
            )}
            {filtered.map((c) => (
              <div
                key={c}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: c === value ? colors.border : "transparent",
                  fontSize: 14,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#182238")}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = c === value ? colors.border : "transparent")
                }
              >
                {onToggleFavorite && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(c);
                    }}
                    title={favorites?.includes(c) ? "Remove from favorites" : "Add to favorites"}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: favorites?.includes(c) ? colors.accent : colors.textTertiary,
                      fontSize: 15,
                      lineHeight: 1,
                      padding: 0,
                    }}
                  >
                    {favorites?.includes(c) ? "★" : "☆"}
                  </button>
                )}
                <div
                  onClick={() => select(c)}
                  style={{ flex: 1, display: "flex", justifyContent: "space-between" }}
                >
                  <span>{CURRENCY_NAMES[c] || "Unlisted currency"}</span>
                  <span style={{ color: colors.accent, fontWeight: 700 }}>{c}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
