import { colors, fonts } from "../styles/tokens.js";
import { rateBetween } from "../lib/convert.js";

/** Scrolling exchange-board ticker strip showing quick-pick currency rates
 *  relative to whatever the user has picked as their base currency. */
export default function Ticker({ tickerCurrencies, rates, base }) {
  return (
    <div
      style={{
        background: colors.panelAlt,
        borderBottom: `1px solid ${colors.border}`,
        overflow: "hidden",
        whiteSpace: "nowrap",
        padding: "8px 0",
      }}
    >
      <div style={{ display: "inline-block", animation: "ticker 28s linear infinite" }}>
        {[...tickerCurrencies, ...tickerCurrencies].map((c, i) => {
          const rate = rates ? rateBetween(rates, base, c) : null;
          return (
            <span
              key={i}
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: 6,
                marginRight: 32,
                fontFamily: fonts.mono,
                fontSize: 13,
              }}
            >
              <span style={{ color: colors.textSecondary }}>{base}/{c}</span>
              <span style={{ color: colors.accent, fontWeight: 600 }}>
                {rate !== null ? rate.toFixed(4) : "—"}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
