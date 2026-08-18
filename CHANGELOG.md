# ExchangeBoard — Changelog

## v1.5.0 — 2026-08-18

Three device-specific branches and a feature branch, combined into one
unified default build.

- **Galaxy Z Fold 5** (`docs/DEVICE_FOLD5.md`) — responsive cover-screen/
  unfolded two-column layout; real hinge-state hardware integration via
  a custom Capacitor plugin (`FoldStatePlugin.java`, Jetpack
  WindowManager's `FoldingFeature`) driving a genuine flex-mode
  (tabletop-posture) layout sized by the actual reported hinge position
  — something no CSS media query can express, since that posture reports
  the same viewport size as fully-unfolded-flat; and two cost-free,
  fully on-device "AI" features: `src/lib/forecast.ts` (linear-regression
  trend insight over existing history data) and `src/lib/currencyQuiz.ts`
  ("Currency IQ", an adaptive miss-rate-weighted learning quiz).
- **Galaxy Tab** (`docs/DEVICE_TABLET.md`) — the same responsive
  two-column approach, plus an extra-wide breakpoint (1024px+) with more
  breathing room and a type-size bump for large tablets in landscape.
- **Galaxy Watch6 Classic** (`docs/DEVICE_WATCH6_CLASSIC.md`) — native
  Wear OS work in `android/wear/`: physical rotary bezel input, an
  always-on-display ambient mode, and a watch-face complication, on top
  of the existing Tile + companion activity.
- **Rate alerts & named basket presets** (`docs/FEATURE_ALERTS_AND_PRESETS.md`)
  — threshold-based rate alerts (foreground/open-app scope, honestly
  documented as such — this project has no backend) with live in-app
  status and an optional browser notification; save/load/delete named
  snapshots of the basket.

Combining these into one `main` needed real hand-merging, not just a git
merge button: Fold5 and Tab each independently created `src/styles/
responsive.css` and rewrote `src/App.tsx`; Alerts+Presets also rewrote
`App.tsx`. The result: one shared `responsive.css` covering every screen
class (cover-screen narrow, wide two-column, extra-wide tablet, and
Fold5's flex-mode), and one `App.tsx` with every feature wired together.
`android/app/build.gradle`'s `versionName` no longer carries a
per-device suffix, since this is now the one default build for every
device — the Fold5-only native hinge plugin degrades to a safe no-op
everywhere else.

112/112 tests passing, `tsc --noEmit` clean, production build + bundle-
size check pass (~64KB gzip, well under the 300KB CI budget). The native
pieces (the Fold5 hinge plugin, the Watch6 Classic Wear OS additions)
are still unverified by a real compile — see the respective docs for
the full verification-status notes; both were authored without Android
SDK/Maven access.

## v1.4.0 — 2026-08-19

Curated cryptocurrency support, converting alongside fiat.

- New `src/lib/crypto.ts`: a fixed, curated list of 10 blue-chip
  cryptocurrencies with long, uninterrupted trading histories on major
  regulated exchanges — `BTC`, `ETH`, `XRP`, `BCH`, `LTC`, `XLM`,
  `ETC`, `ADA`, `TRX`, `BNB`. Deliberately excludes stablecoins (just a
  fiat peg, not a distinct asset) and meme-origin/trending coins. This
  is a product decision, not a technical one — the list lives in one
  place (`CRYPTO_ASSETS`) if it ever needs to change.
- Live prices come from CoinGecko's free `/simple/price` endpoint (no
  API key, CORS-enabled, same pattern as the app's other two data
  sources) and are inverted (`1 / priceUSD`) into the same USD-indexed
  `rates` shape fiat already uses, then merged in — so the picker,
  ticker, basket, and favorites matrix all support crypto with **zero**
  changes to `rateBetween`/`convertAmount` or any component.
- Fully optional and non-blocking: a CoinGecko outage never affects
  fiat conversion. Crypto rates get their own 1-day localStorage cache
  (`exchangeboard:cryptoRatesCache`) with the same
  live-then-cached-then-empty fallback chain as the fiat rate cache,
  and their own Stale-While-Revalidate PWA runtime-cache entry.
- `format.ts`'s non-ISO fallback path (which every crypto code hits,
  since `Intl.NumberFormat` only recognizes ISO 4217 currencies) now
  gets the same extra sub-1 precision fiat already gets in the ISO
  path, instead of a flat 4 decimals.
- 10 new tests for `crypto.ts` (rate inversion, live fetch + cache,
  fallback-to-cache on network failure, safe empty-result path) plus
  a `CURRENCY_NAMES` regression test confirming the crypto merge.
  48/48 tests passing, `tsc --noEmit` clean, bundle size ~57KB gzip
  (unchanged, well under the 300KB CI budget).

## v1.3.1 — 2026-08-19

Full ISO 4217 currency-name coverage pass.

- `src/data/currencyNames.ts` grew from 158 to 169 entries, purely
  additive (nothing existing changed or was removed). Added the
  currently-circulating/recently-redenominated codes that were missing:
  `BYN` (Belarusian Ruble), `SSP` (South Sudanese Pound), `SVC`
  (Salvadoran Colon), `SLE` (Sierra Leonean Leone, the 2022
  redenomination — `SLL` stays for compatibility with feeds still
  using the old code), `XCG` (Caribbean Guilder, replacing `ANG` for
  Curaçao/Sint Maarten — `ANG` stays for the same reason), `VED`
  (Venezuelan Bolívar Digital), `ZWG`/`ZWL` (Zimbabwe Gold and the
  legacy Zimbabwean Dollar), and the IMF/precious-metal codes some
  rate providers return alongside `XAU`/`XAG`: `XDR`, `XPD`, `XPT`.
- New `src/data/currencyNames.test.ts`: data-quality regression tests
  (well-formed codes, no blank names, a 169+ count floor, presence of
  the newly-added codes, every `QUICK_PICKS` entry has a name).
- No changes to conversion logic, localStorage keys, or the live rate
  API integration — this only expands the name lookup used for
  display, so any currency the live API (or a future data source)
  returns gets a real name instead of falling back to its bare code.

## Unreleased — Android widget + Wear OS companion (scaffolded 2026-08-10)

Two staples of a "properly realized" currency app that the web-wrapped
Capacitor build alone doesn't give you: a glanceable home-screen widget and
a native wearable presence. Both are genuinely native (not WebView) and do
their own independent lightweight fetch from `open.er-api.com`, since a
widget/watch process can't reach into the phone WebView's `localStorage`.
Built, installed, and confirmed rendering live rates on a real Galaxy Z
Fold 5 + Galaxy Watch (SM-R965U); not yet version-bumped or shipped
pending your sign-off on the UX.

- **Home-screen widget** (`android/app/.../RateWidgetProvider.java`) —
  `AppWidgetProvider` showing USD/EUR, USD/GBP, USD/JPY. Renders instantly
  from a `SharedPreferences` cache, refreshes in the background (30 min
  minimum, Android's floor for widget updates), tap opens the app.
- **Wear OS module** (`android/wear/`) — new standalone Gradle module,
  `com.cosmicgrub.exchangeboard.wear`, Kotlin:
  - **Tile** (`RateTileService`) — the wearable-native equivalent of the
    widget, same three rates, tap opens the companion activity.
  - **Companion activity** (`MainActivity`) — minimal native (not WebView)
    full-screen rate display, round-face-safe centered layout.
  - Independent APK, not bundled via Play-style `wearApp` phone
    dependency — installed directly to the watch via `adb`.
- Both widget and tile placement (home screen / tile carousel) are a
  manual on-device step by platform design — no app or automation tool
  can add them on the user's behalf.
- Considered but **not** built, to keep this scoped — flagged for later:
  - **Rate alert notifications** — already on the roadmap; needs a
    background job + threshold config, a materially bigger lift than the
    two above.
  - **App shortcuts** (long-press launcher icon → jump to a favorite
    pair) — cheap, but needs the WebView app to handle deep-link intent
    extras, which it doesn't yet.
  - **Quick Settings tile** (phone) — more a general-utility-app
    convention than a currency-app staple; skipped to stay focused on
    what's actually standard for this category.

## v1.3.0 — 2026-08-14

Full-stack hardening pass across four phases: TypeScript, offline
architecture, UI/utility features, and ecosystem tooling. Zero breaking
changes — every `exchangeboard:*` localStorage key and the core
`rates[target] / rates[base]` conversion formula are unchanged.

- **Phase 1 — TypeScript migration & typed state**
  - Every file in `src/` converted from `.js`/`.jsx` to `.ts`/`.tsx`
    under a strict `tsconfig.json`; `npm run build` now runs `tsc
    --noEmit` before `vite build`, and `npm run typecheck` runs it
    standalone.
  - New `src/types/index.ts`: `RateTable`, `AppPrefs`, `RatesCache`,
    `HistoricalData`, `HistoryPoint`, `Status`, `Timeframe`.
  - `convert.ts`'s `rateBetween()`/`convertAmount()` validate numeric
    finiteness explicitly instead of relying on truthy/`isNaN` checks.
  - `App.tsx`'s ad-hoc `setPrefs()` callbacks replaced by a typed
    `useReducer` (`src/reducers/prefsReducer.ts`) isolating five
    actions: `SET_BASE`, `SET_TARGET`, `SWAP_PAIR`, `TOGGLE_FAVORITE`,
    `UPDATE_BASKET`.
- **Phase 2 — Offline & IndexedDB data layer**
  - New `src/lib/db.ts`: a three-tier fallback chain (IndexedDB
    `"history_cache"` store, via `idb-keyval` → `localStorage` → an
    in-memory `Map`), backing the historical rate series so the trend
    chart can render from cache when offline.
  - PWA via `vite-plugin-pwa`: a generated Workbox service worker with
    Stale-While-Revalidate caching for `open.er-api.com` and
    `api.frankfurter.dev`, precaching all built JS/CSS/HTML/font
    assets, plus an installable manifest (`public/icon.svg`).
  - New `OfflineBanner` (driven by a `useOnlineStatus()` hook) shows a
    top-of-page indicator whenever the browser reports no connection
    at all, distinct from the existing per-result "cached rates" badge.
- **Phase 3 — UI, charting & utility enhancements**
  - `HistoryChart.tsx` gained a 7D/30D/90D/1Y timeframe switcher, each
    window cached independently.
  - `AmountPanel.tsx` gained a Fee & Markup calculator (0% / +0.5% /
    +1.5% / +3%) — `applyMarkup()` folds the selected markup into the
    rate/amount shown in the result panel and every basket row, with
    an "incl. X% fee" label; the raw live rate is still the default.
  - New `src/components/Matrix.tsx` — an N x N comparative exchange
    matrix over the favorites list.
  - `format.ts`'s `fmt()`/`rawNum()` now format using the browser's
    `navigator.language` (`getLocale()`, overridable per call) instead
    of a hardcoded `en-US`.
- **Phase 4 — Automation, CI/CD & CLI utility**
  - New `bin/exchangeboard.js` — a dependency-free terminal CLI
    (`npx exchangeboard convert 100 USD EUR`, `rates USD`, `--json`,
    `--refresh`), fetching `open.er-api.com` directly with a 1-hour
    local file cache at `~/.exchangeboard/rates-cache.json`.
  - New `.github/workflows/ci.yml` — typecheck + full Vitest suite on
    every push/PR, plus a production `vite build` gated by a strict
    bundle-size budget (`scripts/check-bundle-size.mjs`).
- Test suite grew from 21 to 33 Vitest tests (db.ts fallback chain,
  `applyMarkup`, locale overrides, the new Matrix component).

## v1.2.0 — 2026-08-09

Backlog cleared: reverse conversion, favorites, history, offline cache, baskets, tests.

- **Reverse (any-base) conversion** — "YOU HAVE" now has its own searchable
  currency picker instead of a fixed USD badge, with a swap (⇅) button to
  flip base/target. All math runs through the single USD-indexed rate table
  (`rateBetween`/`convertAmount` in `src/lib/convert.js`), so no extra
  network calls are needed for any base/target pair.
- **Favorites** — star any currency from either picker's dropdown; favorites
  float to the top of the list and lead the quick-pick chip row. Persisted
  to `localStorage`, along with the last-used base/target/amount and basket,
  so the app resumes where you left off on reload.
- **Historical rate chart** — 30-day sparkline for the current base/target
  pair, sourced from `frankfurter.dev` (ECB reference rates, free/no key).
  Gracefully shows "unavailable" for pairs outside its ~30-currency
  coverage instead of erroring.
- **Offline/cached rate fallback** — every successful rate fetch is cached;
  if a later fetch fails (offline, API down), the app falls back to the
  cached table with a visible "OFFLINE — SHOWING CACHED RATES" badge
  instead of a hard error. Only shows the error state if no cache exists yet.
- **Multi-currency basket** — add any number of target currencies to see the
  same amount converted into all of them at once (e.g. comparing payout
  options); persisted across reloads.
- **Automated tests** — Vitest + React Testing Library. 21 tests covering
  the conversion math (including reverse/chained rates), formatters,
  storage (including corrupt-data and quota-failure handling), and an App
  smoke test for both the happy path and the no-cache error path.
  `npm test` to run.
- Ticker and quick-pick chips are now base-aware (`{base}/{code}`, excluding
  whichever currency is already selected on the other side).

## v1.1.0 — 2026-08-09

Scaffolded into a real project (from the v1.0.0 single-file Claude.ai artifact).

- Set up as a Vite + React app with `package.json`, build tooling, and git
- Split the single-file component into `App.jsx` + focused components
  (`Ticker`, `AmountPanel`, `CurrencySelect`, `ResultPanel`) per the
  masterfile's proposed structure
- Extracted `CURRENCY_NAMES`/`QUICK_PICKS` to `src/data/currencyNames.js`
- Extracted `fetchRates` to `src/lib/api.js`, `fmt`/`rawNum` to `src/lib/format.js`
- Extracted the color/font design tokens to `src/styles/tokens.js`
- No behavior or visual changes — clean architecture pass only
- Added README, docs/ (masterfile + visual reference copies), and this changelog to the repo

## v1.0.0 — 2026-08-09

Initial build.

- USD-fixed base converter with searchable currency dropdown (full name + ISO
  code for every currency, e.g. "Euro (EUR)")
- Instant live conversion as amount or target currency changes (no "=" needed)
- Quick-pick chips for EUR, GBP, JPY, CAD, AUD, INR, CNY, MXN
- Scrolling exchange-board ticker strip for at-a-glance major rates
- Live rate line ("1 USD = X CODE"), last-updated timestamp, manual refresh
- Loading and error/retry states
- Data source: open.er-api.com (free, no key, ~160 currencies)
