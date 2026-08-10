import { useEffect, useState } from "react";
import { colors, fonts } from "./styles/tokens.js";
import { QUICK_PICKS } from "./data/currencyNames.js";
import { fetchRates, getCachedRates } from "./lib/api.js";
import { convertAmount, rateBetween } from "./lib/convert.js";
import { loadJSON, saveJSON } from "./lib/storage.js";
import Ticker from "./components/Ticker.jsx";
import AmountPanel from "./components/AmountPanel.jsx";
import CurrencySelect from "./components/CurrencySelect.jsx";
import ResultPanel from "./components/ResultPanel.jsx";
import HistoryChart from "./components/HistoryChart.jsx";
import Basket from "./components/Basket.jsx";

const defaultPrefs = { base: "USD", target: "EUR", favorites: [], basket: [] };

export default function App() {
  const [rates, setRates] = useState(null);
  const [asOf, setAsOf] = useState(null);
  const [stale, setStale] = useState(false); // true when showing a cached fallback table
  const [status, setStatus] = useState("loading"); // loading | ready | error

  const [prefs, setPrefs] = useState(() => loadJSON("prefs", defaultPrefs));
  const { base, target, favorites, basket } = prefs;
  const [amount, setAmount] = useState("1");

  useEffect(() => {
    saveJSON("prefs", prefs);
  }, [prefs]);

  const setBase = (code) => setPrefs((p) => ({ ...p, base: code }));
  const setTarget = (code) => setPrefs((p) => ({ ...p, target: code }));
  const swap = () => setPrefs((p) => ({ ...p, base: p.target, target: p.base }));

  const toggleFavorite = (code) =>
    setPrefs((p) => ({
      ...p,
      favorites: p.favorites.includes(code)
        ? p.favorites.filter((c) => c !== code)
        : [...p.favorites, code],
    }));

  const addToBasket = (code) =>
    setPrefs((p) => (p.basket.includes(code) ? p : { ...p, basket: [...p.basket, code] }));
  const removeFromBasket = (code) =>
    setPrefs((p) => ({ ...p, basket: p.basket.filter((c) => c !== code) }));

  const loadRates = () => {
    setStatus("loading");
    fetchRates()
      .then(({ rates, asOf }) => {
        setRates(rates);
        setAsOf(asOf);
        setStale(false);
        setStatus("ready");
      })
      .catch(() => {
        const cached = getCachedRates();
        if (cached) {
          setRates(cached.rates);
          setAsOf(cached.asOf);
          setStale(true);
          setStatus("ready");
        } else {
          setStatus("error");
        }
      });
  };

  useEffect(() => {
    loadRates();
  }, []);

  const numericAmount = parseFloat(amount);
  const rate = rates ? rateBetween(rates, base, target) : null;
  const converted = rates ? convertAmount(numericAmount, rates, base, target) : null;

  const tickerCurrencies = QUICK_PICKS.filter((c) => c !== base && rates && rates[c]);

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
      <Ticker tickerCurrencies={tickerCurrencies} rates={rates} base={base} />

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
            Convert between any two of ~160 currencies, live.
          </p>
        </div>

        <AmountPanel
          amount={amount}
          onAmountChange={setAmount}
          base={base}
          onBaseChange={setBase}
          rates={rates}
          excludeCode={target}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            margin: "-4px 0",
            position: "relative",
            zIndex: 1,
          }}
        >
          <button
            onClick={swap}
            aria-label="Swap base and target currencies"
            title="Swap"
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
              border: "none",
              cursor: "pointer",
            }}
          >
            ⇅
          </button>
        </div>

        <CurrencySelect
          rates={rates}
          target={target}
          onChange={setTarget}
          excludeCode={base}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
        />

        <ResultPanel
          status={status}
          amount={amount}
          base={base}
          target={target}
          rate={rate}
          converted={converted}
          stale={stale}
          asOf={asOf}
          onRetry={loadRates}
        />

        {status === "ready" && <HistoryChart base={base} target={target} />}

        {status === "ready" && (
          <Basket
            rates={rates}
            base={base}
            amount={amount}
            codes={basket}
            onAdd={addToBasket}
            onRemove={removeFromBasket}
          />
        )}

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
          <span>
            {status === "ready" && asOf ? `${stale ? "Cached rates (offline) as of" : "Rates as of"} ${asOf}` : " "}
          </span>
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
