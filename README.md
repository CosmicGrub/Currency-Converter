# ExchangeBoard

A single-page, USD-based global currency converter. Type a USD amount, pick a
target currency from a searchable dropdown (full name + ISO code, e.g. "Euro
(EUR)"), and watch the converted amount update instantly — no "=" button,
calculator-style live result.

![status](https://img.shields.io/badge/status-v1.1.0-C9A227)

## Features

- Live USD → any-currency conversion, instant on input or currency change
- Full name + ISO code shown for every currency (~160 currencies)
- Searchable dropdown combobox, quick-pick chips for major currencies
- Scrolling exchange-board rate ticker
- "1 USD = X CODE" rate line, last-updated timestamp, manual refresh
- Loading and error/retry states

## Tech stack

- React 18 (function components, hooks only)
- [Vite](https://vitejs.dev/) for dev server + build
- No CSS framework — hand-styled with a dark "exchange board" palette (see
  [`src/styles/tokens.js`](src/styles/tokens.js))
- Data source: [`open.er-api.com`](https://open.er-api.com/v6/latest/USD) —
  free, no API key required, CORS-enabled, ~160 currencies, updated ~daily.
  Fetched once on load; every conversion after that is computed client-side
  (`amount * rates[code]`) with no per-keystroke network calls.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. No API key or `.env` file needed.

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build locally
```

## Project structure

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

## Docs

Canonical project docs (architecture, data model, changelog, visual
reference) live in [`docs/`](docs/) and are kept in sync with the project's
Google Drive folder.

- [`docs/MASTERFILE.md`](docs/MASTERFILE.md) — architecture, file structure, data model, design tokens
- [`CHANGELOG.md`](CHANGELOG.md) — version history
- [`docs/VISUAL.html`](docs/VISUAL.html) — static visual reference/companion

## Roadmap

Not yet built: multi-currency baskets, historical rate charts, offline/cached
rates, favorites persistence, reverse (non-USD base) conversion, automated
tests.

## License

No license specified yet.
