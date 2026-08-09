import { useEffect, useState } from "react";
import { colors, fonts } from "./styles/tokens.js";
import { QUICK_PICKS } from "./data/currencyNames.js";
import { fetchRates } from "./lib/api.js";
import Ticker from "./components/Ticker.jsx";
import AmountPanel from "./components/AmountPanel.jsx";
import CurrencySelect from "./components/CurrencySelect.jsx";
import ResultPanel from "./components/ResultPanel.jsx";

export default function App() {
  const [rates, setRates] = useState(null);
  const [asOf, setAsOf] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [amount, setAmount] = useState("1");
  const [target, setTarget] = useState("EUR");

  const loadRates = () => {
    setStatus("loading");
    fetchRates()
      .then(({ rates, asOf }) => {
        setRates(rates);
        setAsOf(asOf);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  };

  useEffect(() => {
    loadRates();
  }, []);

  const numericAmount = parseFloat(amount);
  const rate = rates && rates[target] ? rates[target] : null;
  const converted = rate && !isNaN(numericAmount) ? numericAmount * rate : null;

  const tickerCurrencies = QUICK_PICKS.filter((c) => rates && rates[c]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        color: colors.textPrimary,
        fontFamily: fonts.sans,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Ticker tickerCurrencies={tickerCurrencies} rates={rates} />

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes flipIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        select::-ms-expand { display: none; }
      `}</style>

      <div
        style={{
          flex: 1,
          maxWidth: 640,
          width: "100%",
          margin: "0 auto",
          padding: "28px 20px 48px",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              color: colors.accent,
              fontWeight: 600,
              marginBottom: 6,
            }}
          >
            EXCHANGE BOARD
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.15 }}>
            Global Currency Converter
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: 14, marginTop: 6 }}>
            Base currency: United States Dollar (USD)
          </p>
        </div>

        <AmountPanel amount={amount} onChange={setAmount} />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "-4px 0",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: colors.accent,
              color: colors.bg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 15,
              boxShadow: `0 0 0 6px ${colors.bg}`,
            }}
          >
            ↓
          </div>
        </div>

        <CurrencySelect rates={rates} target={target} onChange={setTarget} />

        <ResultPanel
          status={status}
          amount={amount}
          target={target}
          rate={rate}
          converted={converted}
          onRetry={loadRates}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 16,
            fontSize: 12,
            color: colors.textTertiary,
          }}
        >
          <span>{status === "ready" && asOf ? `Rates as of ${asOf}` : " "}</span>
          <button
            onClick={loadRates}
            style={{
              background: "transparent",
              border: "none",
              color: colors.textTertiary,
              cursor: "pointer",
              fontSize: 12,
              textDecoration: "underline",
            }}
          >
            Refresh rates
          </button>
        </div>
      </div>
    </div>
  );
}
