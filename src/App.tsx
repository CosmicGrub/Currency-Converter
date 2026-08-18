import { useEffect, useReducer, useState, type CSSProperties, type ReactNode } from "react";
import { colors, fonts } from "./styles/tokens.js";
import { QUICK_PICKS } from "./data/currencyNames.js";
import { fetchRates, getCachedRates } from "./lib/api.js";
import { fetchCryptoRatesSafe } from "./lib/crypto.js";
import { applyMarkup, convertAmount, rateBetween } from "./lib/convert.js";
import { loadJSON, saveJSON } from "./lib/storage.js";
import { defaultPrefs, prefsReducer } from "./reducers/prefsReducer.js";
import { useOnlineStatus } from "./hooks/useOnlineStatus.js";
import { useFoldState } from "./hooks/useFoldState.js";
import { isFlexMode } from "./lib/foldState.js";
import Ticker from "./components/Ticker.js";
import AmountPanel from "./components/AmountPanel.js";
import CurrencySelect from "./components/CurrencySelect.js";
import ResultPanel from "./components/ResultPanel.js";
import HistoryChart from "./components/HistoryChart.js";
import Basket from "./components/Basket.js";
import Matrix from "./components/Matrix.js";
import Insights from "./components/Insights.js";
import CurrencyQuiz from "./components/CurrencyQuiz.js";
import OfflineBanner from "./components/OfflineBanner.js";
import type { RateTable, Status } from "./types/index.js";

/** Wraps `children` in a real div (for the flex-mode top/bottom split)
 *  only when `active` -- otherwise renders a Fragment, so the wrapped
 *  elements stay *direct* children of .eb-container and the normal wide
 *  two-column grid (responsive.css) keeps placing them by grid-area
 *  exactly as before. An extra always-present wrapper div would break
 *  that grid-area matching, which only applies to a grid's direct
 *  children -- this keeps flex-mode purely additive. */
function FlexGroup({
  active,
  className,
  style,
  children,
}: {
  active: boolean;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  if (!active) return <>{children}</>;
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export default function App() {
  const online = useOnlineStatus();
  const [rates, setRates] = useState<RateTable | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [stale, setStale] = useState(false); // true when showing a cached fallback table
  const [status, setStatus] = useState<Status>("loading");

  const [prefs, dispatch] = useReducer(prefsReducer, undefined, () =>
    loadJSON("prefs", defaultPrefs)
  );
  const { base, target, favorites, basket } = prefs;
  const [amount, setAmount] = useState("1");
  const [markupPct, setMarkupPct] = useState(0); // Fee/markup calculator (Phase 3) -- 0 = live mid-market rate

  // Real Fold5 hinge state (Jetpack WindowManager, bridged natively -- see
  // lib/foldState.ts). FLAT/no-fold everywhere except a Fold5 actually
  // propped open in tabletop/laptop posture, where this drives a genuine
  // hardware-aware layout split that CSS media queries alone can't express
  // (that posture reports the same viewport size as fully unfolded flat).
  const foldState = useFoldState();
  const flexMode = isFlexMode(foldState);
  const hingeTopFraction =
    flexMode && foldState.bounds && typeof window !== "undefined" && window.innerHeight > 0
      ? `${Math.round((foldState.bounds.top / window.innerHeight) * 100)}%`
      : undefined;

  useEffect(() => {
    saveJSON("prefs", prefs);
  }, [prefs]);

  const setBase = (code: string) => dispatch({ type: "SET_BASE", code });
  const setTarget = (code: string) => dispatch({ type: "SET_TARGET", code });
  const swap = () => dispatch({ type: "SWAP_PAIR" });
  const toggleFavorite = (code: string) => dispatch({ type: "TOGGLE_FAVORITE", code });

  const addToBasket = (code: string) => {
    if (!basket.includes(code)) dispatch({ type: "UPDATE_BASKET", basket: [...basket, code] });
  };
  const removeFromBasket = (code: string) =>
    dispatch({ type: "UPDATE_BASKET", basket: basket.filter((c) => c !== code) });

  const loadRates = async () => {
    setStatus("loading");
    try {
      const { rates: fiatRates, asOf: liveAsOf } = await fetchRates();
      // Crypto rides along with the fiat table but never blocks it -- a
      // CoinGecko outage just means the crypto codes are briefly absent
      // (or served from their own cache), never a failure for the app.
      const cryptoRates = await fetchCryptoRatesSafe();
      setRates({ ...fiatRates, ...cryptoRates });
      setAsOf(liveAsOf);
      setStale(false);
      setStatus("ready");
    } catch {
      const cached = getCachedRates();
      if (cached) {
        const cryptoRates = await fetchCryptoRatesSafe();
        setRates({ ...cached.rates, ...cryptoRates });
        setAsOf(cached.asOf);
        setStale(true);
        setStatus("ready");
      } else {
        setStatus("error");
      }
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const numericAmount = parseFloat(amount);
  const rate = rates ? applyMarkup(rateBetween(rates, base, target), markupPct) : null;
  const rawConverted = rates ? convertAmount(numericAmount, rates, base, target) : null;
  const converted = rawConverted !== null ? applyMarkup(rawConverted, markupPct) : null;

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
      <OfflineBanner offline={!online} />
      <Ticker tickerCurrencies={tickerCurrencies} rates={rates} base={base} />

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes flipIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        select::-ms-expand { display: none; }
      `}</style>

      {/* .eb-container: base (mobile/cover-screen) layout lives inline further
          up in this file's history -- now owned by src/styles/responsive.css
          so the stylesheet's media queries can flip display:flex -> grid on
          an unfolded/wide viewport without needing `!important` anywhere.
          `flex: 1` stays inline since it's about sizing within *this* div's
          own parent (the page-level flex column above), not about this
          div's own children -- orthogonal to what the stylesheet controls.
          `flex-mode` + `--hinge-top-fraction` are the real hardware-driven
          layout: applied only when the native plugin reports the device is
          actually propped open in tabletop posture (see useFoldState above). */}
      <div
        className={`eb-container${flexMode ? " flex-mode" : ""}`}
        style={{ flex: 1, ...(hingeTopFraction ? ({ "--hinge-top-fraction": hingeTopFraction } as CSSProperties) : {}) }}
      >
        <FlexGroup active={flexMode} className="eb-flex-top">
          <div className="eb-header" style={{ marginBottom: 28 }}>
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
              Convert between any two of ~160 live currencies, from a
              170-currency ISO 4217 catalog.
            </p>
          </div>

          <div className="eb-amount">
            <AmountPanel
              amount={amount}
              onAmountChange={setAmount}
              base={base}
              onBaseChange={setBase}
              rates={rates}
              excludeCode={target}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              markupPct={markupPct}
              onMarkupChange={setMarkupPct}
            />
          </div>

          <div
            className="eb-swap"
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

          <div className="eb-convert">
            <CurrencySelect
              rates={rates}
              target={target}
              onChange={setTarget}
              excludeCode={base}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          </div>

          <div className="eb-result">
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
              markupPct={markupPct}
            />
          </div>
        </FlexGroup>

        <FlexGroup active={flexMode} className="eb-flex-bottom">
          {status === "ready" && (
            <div className="eb-history">
              <HistoryChart base={base} target={target} />
            </div>
          )}

          {/* Basket before Matrix in source order, matching the original
              stacking order -- matters only in the narrow/cover-screen
              layout, which has no grid-area and just stacks by DOM order.
              The wide grid layout (responsive.css) places both explicitly
              by grid-area regardless of this order. */}
          {status === "ready" && (
            <div className="eb-basket">
              <Basket
                rates={rates}
                base={base}
                amount={amount}
                markupPct={markupPct}
                codes={basket}
                onAdd={addToBasket}
                onRemove={removeFromBasket}
              />
            </div>
          )}

          {status === "ready" && (
            <div className="eb-matrix">
              <Matrix rates={rates} favorites={favorites} />
            </div>
          )}

          {status === "ready" && (
            <div className="eb-insights">
              <Insights base={base} target={target} />
            </div>
          )}

          {status === "ready" && (
            <div className="eb-quiz">
              <CurrencyQuiz />
            </div>
          )}

          <div
            className="eb-footer"
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
        </FlexGroup>
      </div>
    </div>
  );
}
