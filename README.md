# ExchangeBoard

A single-page, USD-based global currency converter. Type a USD amount, pick a
target currency from a searchable dropdown (full name + ISO code, e.g. "Euro
(EUR)"), and watch the converted amount update instantly — no "=" button,
calculator-style live result.

![status](https://img.shields.io/badge/status-v1.3.1-C9A227)

## Features

- Live conversion between **any two** of ~160 live-rate currencies (not
  just from USD), instant on input, currency, or base change — swap sides
  with ⇅; a 169-code ISO 4217 name catalog backs the picker so nearly
  every currency the live API returns gets a real display name
- Full name + ISO code shown for every currency, searchable dropdown on
  both sides, favorites (★) that float to the top and lead the quick-pick chips
- 7D/30D/90D/1Y historical rate trend chart for the current pair
- Fee & Markup calculator (0% / +0.5% / +1.5% / +3%) — see what you'd
  actually receive after a typical transfer/card fee
- N x N comparative exchange matrix over your favorites
- Installable PWA — works fully offline after the first visit (precached
  app shell + Stale-While-Revalidate rate/history caching via a Workbox
  service worker), with an IndexedDB-backed historical data cache
  (falls back to localStorage, then memory, if IndexedDB is unavailable)
- Offline/cached rate fallback — keeps working (with a visible badge) if the
  live API is unreachable, using the last successful fetch
- Multi-currency basket — convert the same amount into several currencies at once
- Everything (base, target, amount, favorites, basket) persists across reloads
- Scrolling exchange-board rate ticker, "1 X = Y" rate line, last-updated
  timestamp, manual refresh, loading/error states
- Terminal CLI (`npx exchangeboard convert 100 USD EUR`) for scripting/CI use

## Tech stack

- React 18 (function components, hooks only) + TypeScript (strict mode)
- [Vite](https://vitejs.dev/) for dev server + build, [Vitest](https://vitest.dev/) + React Testing Library for tests
- [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) for the installable/offline service worker
- [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) for the IndexedDB historical-data cache
- No CSS framework — hand-styled with a dark "exchange board" palette (see
  [`src/styles/tokens.ts`](src/styles/tokens.ts))
- Data sources (both free, no API key, CORS-enabled):
  - [`open.er-api.com`](https://open.er-api.com/v6/latest/USD) — live rates, ~160 currencies, updated ~daily
  - [`frankfurter.dev`](https://api.frankfurter.dev) — historical series for the trend chart, ~30 currencies
- All conversion math runs client-side off one USD-indexed rate table
  (`amount * (rates[target] / rates[base])`) — no extra network calls per
  keystroke or per base/target change
- `localStorage` (+ IndexedDB for history) for favorites, last-used
  base/target/basket, and the offline rate/history caches

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. No API key or `.env` file needed.

```bash
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + production build to dist/
npm run preview     # preview the production build locally
npm run size-check   # enforce the CI bundle-size budget against dist/
npm test             # run the test suite once
npm run test:watch    # watch mode
```

## CLI

A standalone, dependency-free terminal CLI ships in [`bin/exchangeboard.js`](bin/exchangeboard.js):

```bash
npx exchangeboard convert 100 USD EUR
npx exchangeboard rates USD
npx exchangeboard convert 50 GBP JPY --json
npx exchangeboard convert 50 GBP JPY --refresh   # bypass the local cache
```

Fetches `open.er-api.com` directly and caches the rate table at
`~/.exchangeboard/rates-cache.json` for up to an hour, falling back to a
stale cache if the network is unreachable.

## Project structure

```
src/
  types/index.ts             # RateTable, AppPrefs, RatesCache, HistoricalData, HistoryPoint, Status, Timeframe
  reducers/prefsReducer.ts   # typed useReducer for base/target/favorites/basket
  hooks/useOnlineStatus.ts   # navigator.onLine + online/offline event tracking
  data/currencyNames.ts   # ISO 4217 code -> full name map, quick-pick list
  lib/
    api.ts                   # fetchRates() + getCachedRates() — open.er-api.com + offline cache
    convert.ts                # rateBetween()/convertAmount()/applyMarkup() — base-agnostic conversion math
    db.ts                      # IndexedDB -> localStorage -> memory fallback chain (history_cache store)
    history.ts                  # fetchHistory() — frankfurter.dev time series, cached via db.ts
    format.ts                    # fmt(), rawNum(), getLocale() — locale-aware Intl.NumberFormat
    storage.ts                    # namespaced localStorage helpers
  styles/tokens.ts          # design tokens (palette, fonts)
  components/
    Ticker.tsx               # scrolling rate ticker strip (base-aware)
    AmountPanel.tsx            # "YOU HAVE" amount + from-currency picker + fee/markup selector
    CurrencySelect.tsx          # "CONVERT TO" panel — picker + favorites-aware chips
    CurrencyPicker.tsx            # shared searchable combobox w/ favorites (used by both panels)
    ResultPanel.tsx               # live converted result / loading / error / offline states
    HistoryChart.tsx                # 7D/30D/90D/1Y trend chart
    Basket.tsx                       # multi-currency basket panel
    Matrix.tsx                        # N x N favorites comparison matrix
    OfflineBanner.tsx                  # top-of-page "no connection" indicator
  App.tsx                    # composes the above, owns state + persistence
  main.tsx                   # React entry point + service worker registration
  App.test.tsx              # component smoke tests
  test/setup.ts               # Vitest + RTL setup
bin/exchangeboard.js       # terminal CLI (see "CLI" above)
scripts/check-bundle-size.mjs  # CI bundle-size budget gate
.github/workflows/ci.yml  # typecheck + test + build + bundle-size CI
```

## Docs

Canonical project docs (architecture, data model, changelog, visual
reference) live in [`docs/`](docs/) and are kept in sync with the project's
Google Drive folder.

- [`docs/MASTERFILE.md`](docs/MASTERFILE.md) — architecture, file structure, data model, design tokens
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`docs/VISUAL.html`](docs/VISUAL.html) — static visual reference/companion

## Roadmap

The original backlog (multi-currency baskets, historical rate charts,
offline/cached rates, favorites persistence, reverse conversion, automated
tests) shipped in v1.2.0; TypeScript, PWA/offline architecture, the fee
calculator, favorites matrix, and CLI/CI tooling shipped in v1.3.0. Open
ideas: push-based rate alerts, CSV export of the basket, app shortcuts.

## Android app

Wrapped with [Capacitor](https://capacitorjs.com/) — the `android/app`
folder is a generated native project (`npx cap add android` + `npx cap
sync`), not hand-maintained; the web app in `src/` remains the canonical
source. A built debug APK for sideloading lives in
[`releases/`](releases/ExchangeBoard-v1.2.0-debug.apk).

Two hand-written (not Capacitor-generated) native additions, both doing
their own independent rate fetch rather than reading the WebView's cache:

- **Home-screen widget** — `android/app/.../RateWidgetProvider.java`.
  Build with `:app:assembleDebug`, install/place like any widget.
- **Wear OS companion** — `android/wear/`, a standalone module (own
  `applicationId`: `com.cosmicgrub.exchangeboard.wear`). Build with
  `:wear:assembleDebug`, install to a paired watch with `adb -s <watch
  serial> install`. Ships a Tile (glanceable rates, add via the watch's
  tile carousel) and a minimal native companion activity.

## License

No license specified yet.
