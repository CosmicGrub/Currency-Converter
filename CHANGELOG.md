# ExchangeBoard — Changelog

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
