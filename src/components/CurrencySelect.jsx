import { useEffect, useMemo, useRef, useState } from "react";
import { colors } from "../styles/tokens.js";
import { CURRENCY_NAMES, QUICK_PICKS } from "../data/currencyNames.js";

/** "CONVERT TO" panel — searchable custom combobox + quick-pick chips. */
export default function CurrencySelect({ rates, target, onChange }) {
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
    return Object.keys(rates)
      .filter((c) => c !== "USD")
      .sort((a, b) => (CURRENCY_NAMES[a] || a).localeCompare(CURRENCY_NAMES[b] || b));
  }, [rates]);

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

      <div ref={boxRef} style={{ position: "relative", marginTop: 10 }}>
        <button
          onClick={() => setOpen((o) => !o)}
          style={{
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
          }}
        >
          <span>
            {CURRENCY_NAMES[target] || target}{" "}
            <span style={{ color: colors.accent, fontWeight: 700 }}>({target})</span>
          </span>
          <span style={{ color: colors.textSecondary }}>{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              background: colors.panelAlt,
              border: `1px solid ${colors.borderAlt}`,
              borderRadius: 10,
              zIndex: 20,
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
                  onClick={() => select(c)}
                  style={{
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    background: c === target ? colors.border : "transparent",
                    fontSize: 14,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#182238")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = c === target ? colors.border : "transparent")
                  }
                >
                  <span>{CURRENCY_NAMES[c] || "Unlisted currency"}</span>
                  <span style={{ color: colors.accent, fontWeight: 700 }}>{c}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {QUICK_PICKS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
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
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
