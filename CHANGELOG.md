# ExchangeBoard — Changelog

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
