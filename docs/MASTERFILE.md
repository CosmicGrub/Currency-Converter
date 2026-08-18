# ExchangeBoard — Masterfile
**Global any-currency-to-any-currency converter (React app)**

## Overview
Live currency converter covering the ~160 fiat currencies the live rate API
returns, backed by a 169-code ISO 4217 name catalog (`src/data/
currencyNames.ts`) for full display-name coverage, plus a curated set of 10
blue-chip cryptocurrencies (BTC, ETH, XRP, BCH, LTC, XLM, ETC, ADA, TRX,
BNB — see `src/lib/crypto.ts`). Any currency (fiat or crypto) can be the
"from" (base) side, any currency can be the "to" (target) side — swap them
with one tap. Full name + ISO code shown everywhere (e.g. "Euro (EUR)").
Conversion updates instantly as the user types or changes either currency —
no "=" button, calculator-style live result.

## Architecture
- **Type:** Client-side React + TypeScript app (no backend, no server-side DB
  required), built with Vite, installable as a PWA (service worker via
  `vite-plugin-pwa`).
- **Offline data layer:** `src/lib/db.ts` — a three-tier fallback chain
  (IndexedDB `"history_cache"` store via `idb-keyval` → `localStorage` →
  in-memory `Map`) backs the historical rate series so the trend chart can
  render from cache when offline. The service worker additionally
  precaches all static assets and Stale-While-Revalidates all three API
  hosts (fiat rates, history, crypto).
- **Data sources (all free, no API key, CORS-enabled):**
  - `https://open.er-api.com/v6/latest/USD` — live fiat rates, ~160
    currencies, updated ~daily. Fetched once (base=USD) and every
    base/target pair is derived from that single table client-side (see
    Computation below) — no per-pair refetching.
  - `https://api.frankfurter.dev/v1` — 30-day historical series for the
    sparkline chart, ~30 currencies (ECB reference rates). Formerly hosted
    at `frankfurter.app`, which now 301-redirects here *without* CORS
    headers — the `.dev` host must be called directly.
  - `https://api.coingecko.com/api/v3/simple/price` — live prices (USD)
    for the curated crypto list. Each price is inverted (`1 / priceUSD`)
    and merged straight into the same USD-indexed `rates` table the fiat
    data lives in (see `src/lib/crypto.ts`), so every feature built on
    `rates` (picker, ticker, basket, matrix) works on crypto for free.
    Optional and non-blocking: a CoinGecko failure never affects fiat
    conversion, it just means the crypto codes are briefly unavailable
    (or served from their own 1-day localStorage cache).
- **State:** owned by a typed `useReducer` in `App.tsx`
  (`src/reducers/prefsReducer.ts`) for the persisted preference slice
  (`base`/`target`/`favorites`/`basket`, five actions: `SET_BASE`,
  `SET_TARGET`, `SWAP_PAIR`, `TOGGLE_FAVORITE`, `UPDATE_BASKET`), plus plain
  `useState` for session-only values: `amount` (string), `rates` (USD-
  indexed object from the API), `status` (loading/ready/error), `stale`
  (bool — showing cached rates), `markupPct` (fee calculator selection).
  `prefs` persists to `localStorage` under the `exchangeboard:` namespace.
- **Computation:** for a USD-indexed table `rates`, the rate from any `base`
  to any `target` is `rates[target] / rates[base]` (`rateBetween` in
  `src/lib/convert.ts`) — this is what makes reverse/any-base conversion
  free of extra network calls. `converted = amount * rateBetween(...)`,
  recalculated on every render; an optional `applyMarkup()` pass folds in
  the fee-calculator percentage before display.

## File structure
```
src/
  types/index.ts             # RateTable, AppPrefs, RatesCache, HistoricalData, HistoryPoint, Status, Timeframe
  reducers/prefsReducer.ts   # typed useReducer for base/target/favorites/basket
  hooks/useOnlineStatus.ts   # navigator.onLine + online/offline event tracking
  data/currencyNames.ts   # ISO 4217 code -> full name map, quick-pick list
  lib/
    api.ts                   # fetchRates() + getCachedRates() — fiat, open.er-api.com (offline fallback cache)
    crypto.ts                 # CRYPTO_ASSETS (curated 10) + fetchCryptoRatesSafe() — coingecko.com, merges into `rates`
    convert.ts                  # rateBetween()/convertAmount()/applyMarkup() — base-agnostic math
    db.ts                        # IndexedDB -> localStorage -> memory fallback chain (history_cache store)
    history.ts                    # fetchHistory() — frankfurter.dev time series, cached via db.ts
    format.ts                      # fmt(), rawNum(), getLocale() — locale-aware Intl.NumberFormat
    storage.ts                      # namespaced localStorage helpers (never throws)
  styles/tokens.ts          # design tokens (palette, fonts)
  components/
    Ticker.tsx               # scrolling rate ticker strip (base-aware)
    AmountPanel.tsx            # "YOU HAVE" amount + from-currency picker + fee/markup selector
    CurrencySelect.tsx          # "CONVERT TO" panel — picker + favorites-aware chips
    CurrencyPicker.tsx            # shared searchable combobox w/ favorite star (both panels)
    ResultPanel.tsx               # live result / loading / error / offline-cached states
    HistoryChart.tsx                # 7D/30D/90D/1Y trend chart (inline SVG, no chart lib)
    Basket.tsx                       # multi-currency basket panel
    Matrix.tsx                        # N x N comparative exchange matrix over favorites
    OfflineBanner.tsx                  # top-of-page "no connection" indicator
  App.tsx                    # composes the above, owns state + persistence + swap
  main.tsx                   # React entry point + service worker registration
  App.test.tsx              # component smoke tests (Vitest + RTL)
bin/exchangeboard.js       # standalone terminal CLI (see "CLI" below)
scripts/check-bundle-size.mjs  # CI bundle-size budget gate
.github/workflows/ci.yml  # typecheck + test + build + bundle-size CI
```

## Data model
No server-side database. In-memory + `localStorage` (+ IndexedDB for
history, see Architecture) only:
```ts
rates: { [code: string]: number }          // USD-indexed: 1 USD = rates[code] units, rates.USD === 1
                                            // (fiat from open.er-api.com + crypto from coingecko.com, merged)
CURRENCY_NAMES: { [code: string]: string } // FIAT_NAMES (ISO 4217) + CRYPTO_NAMES, merged in currencyNames.ts

// persisted as localStorage["exchangeboard:prefs"]
prefs: {
  base: string; target: string;             // last-used currency pair
  favorites: string[]; basket: string[];     // starred codes, basket codes
}
// persisted as localStorage["exchangeboard:ratesCache"]
ratesCache: { rates: Record<string, number>; asOf: string } // last successful fiat fetch, used offline
// persisted as localStorage["exchangeboard:cryptoRatesCache"]
cryptoRatesCache: { rates: Record<string, number>; fetchedAt: string } // last successful crypto fetch, used offline

// backed by src/lib/db.ts (IndexedDB "history_cache" -> localStorage -> memory)
history:{base}:{target}:{days}d -> HistoryPoint[]  // per-timeframe historical series cache
```

## CLI (bin/exchangeboard.js)
Dependency-free Node ESM script, registered as the package's `bin` entry:
```
npx exchangeboard convert 100 USD EUR
npx exchangeboard rates USD [--json] [--refresh]
```
Mirrors `rateBetween`/`convertAmount` exactly (duplicated inline, not
imported, so it runs with zero build step) and caches the fetched rate
table at `~/.exchangeboard/rates-cache.json` for 1 hour, falling back to a
stale cache on network failure.

## API endpoints (external, consumed not owned)
`GET https://open.er-api.com/v6/latest/USD`
```json
{
  "result": "success",
  "base_code": "USD",
  "time_last_update_utc": "...",
  "rates": { "USD": 1, "EUR": 0.87, "GBP": 0.74, ... }
}
```
`GET https://api.frankfurter.dev/v1/{start}..{end}?from={base}&to={target}`
```json
{ "rates": { "2026-07-10": { "EUR": 0.87489 }, ... } }
```
`GET https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,...&vs_currencies=usd`
```json
{ "bitcoin": { "usd": 65000.12 }, "ethereum": { "usd": 3400.50 }, ... }
```

## UI architecture
- Offline banner (top, conditional): shown whenever the browser reports no
  network connection at all (distinct from the per-result stale badge).
- Ticker strip: scrolling marquee of quick-pick rates relative to the current base.
- Amount panel ("YOU HAVE"): amount input + searchable from-currency picker +
  fee/markup selector (0% / +0.5% / +1.5% / +3%).
- Swap control (⇅): flips base and target.
- Target panel ("CONVERT TO"): searchable picker + favorites-led quick-pick chips.
- Result panel: live converted amount (with fee/markup applied if selected),
  "1 X = Y" rate line, offline/stale badge.
- History chart: 7D/30D/90D/1Y trend chart for the current pair, or a graceful "unavailable" note.
- Basket panel: add/remove currencies to see the same amount converted into all of them.
- Favorites matrix: N x N comparative table for every starred currency.
- Footer: last-updated timestamp (or "cached … offline") + manual refresh.

## Visual design tokens
- Background: #0B1220 (deep ink navy) / panels #121B2E, #0F1729
- Accent: #C9A227 (brass/gold — currency/exchange-board motif)
- Text: #EDEFF3 primary, #8B94A7 secondary, #5C6885 tertiary
- Type: JetBrains Mono for numerals/rates, Inter/system sans for labels
- Signature element: exchange-board ticker tape + instant "flip" result reveal

## Status (v1.5.0 — 2026-08-18)
- ✅ Any-currency-to-any-currency conversion, instant, with swap —
  169-code ISO 4217 fiat catalog + 10 curated blue-chip cryptocurrencies
- ✅ Device-tuned responsive layout: Galaxy Z Fold 5 (cover-screen +
  unfolded two-column + real hinge-hardware-driven flex mode, via a
  custom Capacitor plugin over Jetpack WindowManager's `FoldingFeature`),
  Galaxy Tab (extra-wide breakpoint), everything in between — see
  `docs/DEVICE_FOLD5.md` / `docs/DEVICE_TABLET.md`
- ✅ On-device "AI" — linear-regression trend insight (`src/lib/forecast.ts`)
  and an adaptive "Currency IQ" learning quiz (`src/lib/currencyQuiz.ts`),
  both fully client-side, zero cost, no external API
- ✅ Threshold-based rate alerts (in-app status + optional browser
  notification, foreground/open-app scope) and named basket presets —
  see `docs/FEATURE_ALERTS_AND_PRESETS.md`
- ✅ Favorites (starred, persisted, lead the quick-pick chips) + N x N
  favorites comparison matrix
- ✅ 7D/30D/90D/1Y historical rate trend chart, per-timeframe offline cache
- ✅ Offline/cached rate fallback with visible badge + top-level offline banner
- ✅ Multi-currency basket, persisted, fee/markup-aware
- ✅ Fee & Markup calculator (0% / +0.5% / +1.5% / +3%) applied live
- ✅ Persisted base/target/amount-adjacent prefs across reloads
- ✅ TypeScript throughout `src/`, typed `useReducer` state, strict `tsconfig`
- ✅ Installable PWA — Workbox service worker, Stale-While-Revalidate API
  caching, full asset precache
- ✅ IndexedDB-backed offline data layer (`idb-keyval`) with localStorage/
  memory fallback for historical data
- ✅ Locale-aware number/currency formatting (`Intl.NumberFormat` +
  `navigator.language`)
- ✅ Curated crypto rates (BTC, ETH, XRP, BCH, LTC, XLM, ETC, ADA, TRX,
  BNB) merged into the same USD-indexed `rates` table as fiat — CoinGecko,
  free/no-key, optional/non-blocking, own 1-day offline cache
- ✅ Terminal CLI (`bin/exchangeboard.js`, `npx exchangeboard convert/rates`)
- ✅ GitHub Actions CI: typecheck, tests, build, bundle-size budget gate
- ✅ Automated tests (Vitest + RTL, 112 tests: conversion math incl.
  markup, formatters incl. locale overrides, storage/db fallback chain
  edge cases, crypto rate fetch/cache/fallback, currency-name data
  quality, fold-state/forecast/quiz/alerts pure logic, Matrix/Insights/
  CurrencyQuiz/Alerts components, App smoke tests)
- ✅ Real Vite + React project with git/GitHub, split into focused modules
- ✅ Android app (Capacitor), merged to `main`, sideload-tested
- ✅ Android home-screen widget — native `AppWidgetProvider`, own rate
  fetch, in `android/app/`; see CHANGELOG "Unreleased" for detail
- ✅ Wear OS companion enhanced: physical rotary bezel input, ambient/
  always-on-display mode, watch-face complication (Watch6 Classic) — see
  `docs/DEVICE_WATCH6_CLASSIC.md`
- ✅ Wear OS companion — native Tile + activity, standalone `android/wear`
  module; see CHANGELOG "Unreleased" for detail
- ⬜ Not yet built: rate alert notifications, CSV export, app shortcuts,
  Quick Settings tile

## Standing rules for this project
- Canonical docs: this masterfile + CHANGELOG.md + docs/VISUAL.html —
  amend in place, never duplicate.
- Keep synced across: project knowledge / memory / Google Drive / GitHub repo
  (https://github.com/CosmicGrub/Currency-Converter).
- Known gap: the Google Drive copies of these three docs cannot currently be
  amended in place via the available Drive tooling (read/create only, no
  update) — the GitHub repo's `docs/` copies are the up-to-date version
  until that's resolved.
