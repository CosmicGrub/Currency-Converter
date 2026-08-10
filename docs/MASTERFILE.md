# ExchangeBoard — Masterfile
**Global any-currency-to-any-currency converter (React app)**

## Overview
Live currency converter covering ~160 currencies. Any currency can be the
"from" (base) side, any currency can be the "to" (target) side — swap them
with one tap. Full name + ISO code shown everywhere (e.g. "Euro (EUR)").
Conversion updates instantly as the user types or changes either currency —
no "=" button, calculator-style live result.

## Architecture
- **Type:** Client-side React app (no backend, no DB required), built with Vite.
- **Data sources (both free, no API key, CORS-enabled):**
  - `https://open.er-api.com/v6/latest/USD` — live rates, ~160 currencies,
    updated ~daily. This is the *only* rate source; it's fetched once
    (base=USD) and every base/target pair is derived from that single
    table client-side (see Computation below) — no per-pair refetching.
  - `https://api.frankfurter.dev/v1` — 30-day historical series for the
    sparkline chart, ~30 currencies (ECB reference rates). Formerly hosted
    at `frankfurter.app`, which now 301-redirects here *without* CORS
    headers — the `.dev` host must be called directly.
- **State:** `base`/`target` (ISO codes), `amount` (string), `rates` (USD-
  indexed object from the API), `status` (loading/ready/error), `stale`
  (bool — showing cached rates), `favorites`/`basket` (arrays), all
  persisted to `localStorage` under the `exchangeboard:` namespace.
- **Computation:** for a USD-indexed table `rates`, the rate from any `base`
  to any `target` is `rates[target] / rates[base]` (`rateBetween` in
  `src/lib/convert.js`) — this is what makes reverse/any-base conversion
  free of extra network calls. `converted = amount * rateBetween(...)`,
  recalculated on every render.

## File structure
```
src/
  data/currencyNames.js   # ISO 4217 code -> full name map, quick-pick list
  lib/
    api.js                  # fetchRates() + getCachedRates() (offline fallback cache)
    convert.js               # rateBetween()/convertAmount() — base-agnostic math
    history.js                # fetchHistory() — frankfurter.dev time series
    format.js                  # fmt(), rawNum() display formatters
    storage.js                  # namespaced localStorage helpers (never throws)
  styles/tokens.js          # design tokens (palette, fonts)
  components/
    Ticker.jsx               # scrolling rate ticker strip (base-aware)
    AmountPanel.jsx            # "YOU HAVE" amount + from-currency picker
    CurrencySelect.jsx          # "CONVERT TO" panel — picker + favorites-aware chips
    CurrencyPicker.jsx            # shared searchable combobox w/ favorite star (both panels)
    ResultPanel.jsx               # live result / loading / error / offline-cached states
    HistoryChart.jsx                # 30-day sparkline (inline SVG, no chart lib)
    Basket.jsx                       # multi-currency basket panel
  App.jsx                    # composes the above, owns state + persistence + swap
  main.jsx                   # React entry point
  App.test.jsx              # component smoke tests (Vitest + RTL)
```

## Data model
No database. In-memory + `localStorage` only:
```ts
rates: { [isoCode: string]: number }        // USD-indexed: 1 USD = rates[code] units, rates.USD === 1
CURRENCY_NAMES: { [isoCode: string]: string } // static ISO 4217 name map

// persisted as localStorage["exchangeboard:prefs"]
prefs: {
  base: string; target: string;             // last-used currency pair
  favorites: string[]; basket: string[];     // starred codes, basket codes
}
// persisted as localStorage["exchangeboard:ratesCache"]
ratesCache: { rates: Record<string, number>; asOf: string } // last successful fetch, used offline
```

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

## UI architecture
- Ticker strip (top): scrolling marquee of quick-pick rates relative to the current base.
- Amount panel ("YOU HAVE"): amount input + searchable from-currency picker.
- Swap control (⇅): flips base and target.
- Target panel ("CONVERT TO"): searchable picker + favorites-led quick-pick chips.
- Result panel: live converted amount, "1 X = Y" rate line, offline/stale badge.
- History chart: 30-day sparkline for the current pair, or a graceful "unavailable" note.
- Basket panel: add/remove currencies to see the same amount converted into all of them.
- Footer: last-updated timestamp (or "cached … offline") + manual refresh.

## Visual design tokens
- Background: #0B1220 (deep ink navy) / panels #121B2E, #0F1729
- Accent: #C9A227 (brass/gold — currency/exchange-board motif)
- Text: #EDEFF3 primary, #8B94A7 secondary, #5C6885 tertiary
- Type: JetBrains Mono for numerals/rates, Inter/system sans for labels
- Signature element: exchange-board ticker tape + instant "flip" result reveal

## Status (v1.2.0 — 2026-08-09)
- ✅ Any-currency-to-any-currency conversion, instant, with swap
- ✅ Favorites (starred, persisted, lead the quick-pick chips)
- ✅ 30-day historical rate sparkline
- ✅ Offline/cached rate fallback with visible badge
- ✅ Multi-currency basket, persisted
- ✅ Persisted base/target/amount-adjacent prefs across reloads
- ✅ Automated tests (Vitest + RTL, 21 tests: conversion math, formatters,
  storage edge cases, App smoke tests for happy path + no-cache error path)
- ✅ Real Vite + React project with git/GitHub, split into focused modules
- ✅ Android app (Capacitor), merged to `main`, sideload-tested
- ✅ Android home-screen widget — native `AppWidgetProvider`, own rate
  fetch, in `android/app/`; see CHANGELOG "Unreleased" for detail
- ✅ Wear OS companion — native Tile + activity, standalone `android/wear`
  module; see CHANGELOG "Unreleased" for detail
- ⬜ Not yet built: installable/PWA offline mode, rate alert notifications,
  CSV export, app shortcuts, Quick Settings tile

## Standing rules for this project
- Canonical docs: this masterfile + CHANGELOG.md + docs/VISUAL.html —
  amend in place, never duplicate.
- Keep synced across: project knowledge / memory / Google Drive / GitHub repo
  (https://github.com/CosmicGrub/Currency-Converter).
- Known gap: the Google Drive copies of these three docs cannot currently be
  amended in place via the available Drive tooling (read/create only, no
  update) — the GitHub repo's `docs/` copies are the up-to-date version
  until that's resolved.
