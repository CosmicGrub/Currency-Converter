# ExchangeBoard — Masterfile
**Global USD-based currency converter (React app)**

## Overview
Live currency converter. USD is the fixed base/primary currency. User enters a
USD amount and picks any target currency from a searchable dropdown (full name
+ ISO code shown, e.g. "Euro (EUR)"). Conversion updates instantly as the user
types or changes currency — no "=" button, calculator-style live result.

## Architecture
- **Type:** Client-side React app (no backend, no DB required), built with Vite.
- **Data source:** `https://open.er-api.com/v6/latest/USD` — free, no API key,
  CORS-enabled, ~160 currencies, updated ~daily.
- **State:** `amount` (string), `target` (ISO code), `rates` (object from API),
  `status` (loading/ready/error), search/open state for the combobox.
- **Computation:** `converted = amount * rates[target]`, recalculated on
  every render — no extra network calls per keystroke.

## File structure
```
src/
  data/currencyNames.js   # ISO 4217 code -> full name map, quick-pick list
  lib/api.js               # fetchRates() — talks to open.er-api.com
  lib/format.js             # fmt(), rawNum() display formatters
  styles/tokens.js          # design tokens (palette, fonts)
  components/
    Ticker.jsx               # scrolling rate ticker strip
    AmountPanel.jsx           # "YOU HAVE" USD input
    CurrencySelect.jsx        # "CONVERT TO" searchable combobox + chips
    ResultPanel.jsx           # live converted result / loading / error states
  App.jsx                    # composes the above, owns state
  main.jsx                   # React entry point
```
As of v1.1.0 this was split out of the original single-file v1.0.0 prototype
(`currency-converter.jsx`) per the structure proposed below — no behavior or
visual changes, clean architecture pass only.

## Data model
No database. In-memory only:
```ts
rates: { [isoCode: string]: number } // 1 USD = rates[code] units
CURRENCY_NAMES: { [isoCode: string]: string } // static ISO 4217 name map
```

## API endpoints (external, consumed not owned)
`GET https://open.er-api.com/v6/latest/USD`
```json
{
  "result": "success",
  "base_code": "USD",
  "time_last_update_utc": "...",
  "rates": { "EUR": 0.91, "GBP": 0.78, ... }
}
```

## UI architecture
- Ticker strip (top): scrolling marquee of quick-pick currency rates.
- Amount panel: USD input, large monospace numerals.
- Target panel: searchable custom combobox (name + code), quick-pick chips.
- Result panel: live converted amount + "1 USD = X CODE" rate line.
- Footer: last-updated timestamp + manual refresh.

## Visual design tokens
- Background: #0B1220 (deep ink navy) / panels #121B2E, #0F1729
- Accent: #C9A227 (brass/gold — currency/exchange-board motif)
- Text: #EDEFF3 primary, #8B94A7 secondary, #5C6885 tertiary
- Type: JetBrains Mono for numerals/rates, Inter/system sans for labels
- Signature element: exchange-board ticker tape + instant "flip" result reveal

## Status (v1.1.0 — 2026-08-09)
- ✅ Live USD → any-currency conversion, instant on input/selection change
- ✅ Full name + ISO code shown for every currency
- ✅ Searchable dropdown, quick-pick chips for major currencies
- ✅ Live rate ticker, last-updated timestamp, manual refresh, error/retry state
- ✅ Scaffolded into a real Vite + React project with git/GitHub, split into
  focused modules/components
- ⬜ Not yet built: multi-currency baskets, historical charts, offline cache,
  favorites persistence, reverse (non-USD base) conversion, automated tests

## Standing rules for this project
- Canonical docs: this masterfile + CHANGELOG.md + docs/VISUAL.html —
  amend in place, never duplicate.
- Keep synced across: project knowledge / memory / Google Drive / GitHub repo
  (https://github.com/CosmicGrub/Currency-Converter).
