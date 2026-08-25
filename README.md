# ExchangeBoard

A single-page, USD-based global currency converter. Type a USD amount, pick a
target currency from a searchable dropdown (full name + ISO code, e.g. "Euro
(EUR)"), and watch the converted amount update instantly — no "=" button,
calculator-style live result.

![status](https://img.shields.io/badge/status-v1.6.2-C9A227)

## Features

- Live conversion between **any two** of ~160 live-rate fiat currencies
  (not just from USD), instant on input, currency, or base change — swap
  sides with ⇅; a 169-code ISO 4217 name catalog backs the picker so
  nearly every currency the live API returns gets a real display name
- 10 curated blue-chip cryptocurrencies (BTC, ETH, XRP, BCH, LTC, XLM,
  ETC, ADA, TRX, BNB) convert right alongside fiat — a fixed,
  long-track-record list, no stablecoins or meme-origin coins, no
  trending/"here today gone tomorrow" tokens
- Full name + ISO code shown for every currency, searchable dropdown on
  both sides, favorites (★) that float to the top and lead the quick-pick chips
- 7D/30D/90D/1Y historical rate trend chart for the current pair, plus an
  on-device linear-regression trend insight (`docs/DEVICE_FOLD5.md`) —
  fully client-side, zero cost, not a financial forecast
- "Currency IQ" — an adaptive, miss-rate-weighted name-the-currency quiz
- Fee & Markup calculator (0% / +0.5% / +1.5% / +3%) — see what you'd
  actually receive after a typical transfer/card fee
- Threshold-based rate alerts, in-app status + optional browser
  notification (foreground/open-app scope — see
  `docs/FEATURE_ALERTS_AND_PRESETS.md`)
- N x N comparative exchange matrix over your favorites
- Named basket presets — save/load/delete whole basket snapshots
- Export the basket to CSV
- Responsive layout tuned per device: Galaxy Z Fold 5 (cover-screen +
  unfolded two-column + real hinge-hardware-driven flex mode on an
  actual foldable), Galaxy Tab (extra-wide breakpoint for large
  tablets), and everything in between
- Installable PWA — works fully offline after the first visit (precached
  app shell + Stale-While-Revalidate rate/history caching via a Workbox
  service worker), with an IndexedDB-backed historical data cache
  (falls back to localStorage, then memory, if IndexedDB is unavailable)
- Offline/cached rate fallback — keeps working (with a visible badge) if the
  live API is unreachable, using the last successful fetch
- Multi-currency basket — convert the same amount into several currencies at once
- Everything (base, target, amount, favorites, basket, presets, alerts)
  persists across reloads
- Scrolling exchange-board rate ticker, "1 X = Y" rate line, last-updated
  timestamp, manual refresh, loading/error states
- Terminal CLI (`npx exchangeboard convert 100 USD EUR`) for scripting/CI use
- Android home-screen widget, Wear OS companion (Tile + rotary bezel
  input + ambient mode + watch-face complication on Watch6 Classic)

## Tech stack

- React 18 (function components, hooks only) + TypeScript (strict mode)
- [Vite](https://vitejs.dev/) for dev server + build, [Vitest](https://vitest.dev/) + React Testing Library for tests
- [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) for the installable/offline service worker
- [`idb-keyval`](https://github.com/jakearchibald/idb-keyval) for the IndexedDB historical-data cache
- No CSS framework — hand-styled with a dark "exchange board" palette (see
  [`src/styles/tokens.ts`](src/styles/tokens.ts))
- Data sources (all free, no API key, CORS-enabled):
  - [`open.er-api.com`](https://open.er-api.com/v6/latest/USD) — live fiat rates, ~160 currencies, updated ~daily
  - [`frankfurter.dev`](https://api.frankfurter.dev) — historical series for the trend chart, ~30 currencies
  - [`coingecko.com`](https://api.coingecko.com/api/v3/simple/price) — live prices for the curated crypto list,
    inverted and merged into the same `rates` table as fiat; optional and non-blocking
- All conversion math runs client-side off one USD-indexed rate table
  (`amount * (rates[target] / rates[base])`) — no extra network calls per
  keystroke or per base/target change
- `localStorage` (+ IndexedDB for history) for favorites, last-used
  base/target/basket, and the offline rate/history caches
- [`zod`](https://zod.dev/) validates every external API response's actual
  shape at runtime before any of it is trusted, instead of a bare
  TypeScript `as` cast — see `docs/ENGINEERING_HARDENING.md`
- A typed `DataSourceError` taxonomy (`network`/`http`/`shape`/`empty`)
  distinguishes *why* a fetch failed, so the UI can say something more
  honest than a generic "something went wrong" (`src/lib/errors.ts`)
- The IndexedDB history cache is schema-versioned (`src/lib/db.ts`) — a
  future change to what's stored there wipes stale-shaped records instead
  of silently reading them back as if they still matched
- Automated accessibility testing (`jest-axe`) and property-based testing
  (`fast-check`, for the core conversion math) run as part of the normal
  test suite — see `docs/ENGINEERING_HARDENING.md`

## Getting started

```bash
npm install --legacy-peer-deps
npm run dev
```

Then open the printed local URL. No API key or `.env` file needed.

The `--legacy-peer-deps` flag is required, not optional: `@typescript-eslint`
doesn't yet support this project's TypeScript 7 (its own runtime version
check refuses to load against it at all — not just an unbumped peer range),
so npm's strict peer resolver won't install otherwise. A `postinstall` step
(`scripts/link-eslint-typescript-compat.mjs`) then gives ESLint tooling a
separately-installed TypeScript 6.0.3 to use, without touching the actual
`typescript@^7.0.2` this project builds with anywhere else — see the header
comment in [`.eslintrc.cjs`](.eslintrc.cjs) for the full story.

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint
npm run build         # typecheck + production build to dist/
npm run preview        # preview the production build locally
npm run size-check      # enforce the CI bundle-size budget against dist/
npm test                 # run the test suite once
npm run test:watch        # watch mode
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
    crypto.ts                 # CRYPTO_ASSETS (curated 10) + fetchCryptoRatesSafe() — coingecko.com
    convert.ts                  # rateBetween()/convertAmount()/applyMarkup() — base-agnostic conversion math
    schemas.ts                    # zod schemas validating every external API response's real shape
    errors.ts                      # DataSourceError — typed network/http/shape/empty error taxonomy
    db.ts                            # IndexedDB -> localStorage -> memory fallback chain, schema-versioned
    history.ts                        # fetchHistory() — frankfurter.dev time series, cached via db.ts
    format.ts                          # fmt(), rawNum(), getLocale() — locale-aware Intl.NumberFormat
    storage.ts                          # namespaced localStorage helpers
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
scripts/link-eslint-typescript-compat.mjs  # postinstall: TS 6 compat for ESLint tooling only
.eslintrc.cjs              # ESLint config — see its header comment for the TS 7 compat story
.github/workflows/ci.yml  # typecheck + lint + test + build + bundle-size + Android compile + instrumented-emulator CI
```

## Docs

Canonical project docs (architecture, data model, changelog, visual
reference) live in [`docs/`](docs/) and are kept in sync with the project's
Google Drive folder.

- [`docs/MASTERFILE.md`](docs/MASTERFILE.md) — architecture, file structure, data model, design tokens
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`docs/VISUAL.html`](docs/VISUAL.html) — static visual reference/companion
- [`docs/DEVICE_FOLD5.md`](docs/DEVICE_FOLD5.md) — Fold5 layout, real hinge-hardware flex mode, on-device AI (trend insight + Currency IQ quiz)
- [`docs/DEVICE_TABLET.md`](docs/DEVICE_TABLET.md) — Galaxy Tab layout tuning
- [`docs/DEVICE_WATCH6_CLASSIC.md`](docs/DEVICE_WATCH6_CLASSIC.md) — Wear OS rotary input, ambient mode, complication
- [`docs/FEATURE_ALERTS_AND_PRESETS.md`](docs/FEATURE_ALERTS_AND_PRESETS.md) — rate alerts + named basket presets
- [`docs/BUILD_STEPS.md`](docs/BUILD_STEPS.md) — per-device build/install steps (Fold5, Tab, Watch6 Classic)
- [`docs/DEVICE_VERIFICATION_CHECKLIST.md`](docs/DEVICE_VERIFICATION_CHECKLIST.md) — what CI verifies automatically vs. what still needs a real device
- [`docs/ENGINEERING_HARDENING.md`](docs/ENGINEERING_HARDENING.md) — runtime validation, typed errors, schema versioning, a11y + property-based testing

## Roadmap

The original backlog (multi-currency baskets, historical rate charts,
offline/cached rates, favorites persistence, reverse conversion, automated
tests) shipped in v1.2.0; TypeScript, PWA/offline architecture, the fee
calculator, favorites matrix, and CLI/CI tooling shipped in v1.3.0; full
ISO 4217 currency-name coverage and curated blue-chip crypto shipped in
v1.3.1/v1.4.0; device-tuned layouts (Fold5 hinge-hardware flex mode +
on-device AI, Galaxy Tab, Watch6 Classic rotary/ambient/complication) and
rate alerts + basket presets shipped in v1.5.0; a real Android compile
check in CI shipped in v1.5.1; runtime API response validation, a typed
error taxonomy, IndexedDB schema versioning, automated accessibility
testing, and property-based testing for the core conversion math shipped
in v1.6.0 (see `docs/ENGINEERING_HARDENING.md`); a real, working ESLint
config (it never had one before — `npm run lint` failed outright) shipped
in v1.6.1; real-runtime instrumented emulator tests for both native
modules (`instrumented-app`/`instrumented-wear` CI jobs) plus a precise
checklist for what still needs real hardware
(`docs/DEVICE_VERIFICATION_CHECKLIST.md`) shipped in v1.6.2. Open ideas:
CSV export of the basket, app shortcuts, true background rate alerts via
a native WorkManager job (see `docs/FEATURE_ALERTS_AND_PRESETS.md`),
dependency vulnerability scanning and Lighthouse CI (scoped out of v1.6.0
as process tooling rather than correctness guarantees — see
`docs/ENGINEERING_HARDENING.md`).

## Android app

Wrapped with [Capacitor](https://capacitorjs.com/) — the `android/app`
folder is a generated native project (`npx cap add android` + `npx cap
sync`), not hand-maintained; the web app in `src/` remains the canonical
source. A built debug APK for sideloading lives in
[`releases/`](releases/ExchangeBoard-v1.2.0-debug.apk). CI compiles both
`:app` and `:wear` on every push, then launches each on a real (emulated)
Android/Wear OS runtime to confirm it runs without crashing (see
`.github/workflows/ci.yml`) — check those jobs' status before treating a
given commit as verified. Real hardware-specific behavior (fold-hinge
sensing, a physical rotary bezel, an actual always-on display) still
needs a real device or a full Android Studio emulator session — see
`docs/DEVICE_VERIFICATION_CHECKLIST.md`.

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
