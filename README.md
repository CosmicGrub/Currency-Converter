# ExchangeBoard

A single-page, USD-based global currency converter. Type a USD amount, pick a
target currency from a searchable dropdown (full name + ISO code, e.g. "Euro
(EUR)"), and watch the converted amount update instantly — no "=" button,
calculator-style live result.

![status](https://img.shields.io/badge/status-v1.2.0-C9A227)

## Features

- Live conversion between **any two** of ~160 currencies (not just from
  USD), instant on input, currency, or base change — swap sides with ⇅
- Full name + ISO code shown for every currency, searchable dropdown on
  both sides, favorites (★) that float to the top and lead the quick-pick chips
- 30-day historical rate sparkline for the current pair
- Offline/cached rate fallback — keeps working (with a visible badge) if the
  live API is unreachable, using the last successful fetch
- Multi-currency basket — convert the same amount into several currencies at once
- Everything (base, target, amount, favorites, basket) persists across reloads
- Scrolling exchange-board rate ticker, "1 X = Y" rate line, last-updated
  timestamp, manual refresh, loading/error states

## Tech stack

- React 18 (function components, hooks only)
- [Vite](https://vitejs.dev/) for dev server + build, [Vitest](https://vitest.dev/) + React Testing Library for tests
- No CSS framework — hand-styled with a dark "exchange board" palette (see
  [`src/styles/tokens.js`](src/styles/tokens.js))
- Data sources (both free, no API key, CORS-enabled):
  - [`open.er-api.com`](https://open.er-api.com/v6/latest/USD) — live rates, ~160 currencies, updated ~daily
  - [`frankfurter.dev`](https://api.frankfurter.dev) — 30-day history for the sparkline, ~30 currencies
- All conversion math runs client-side off one USD-indexed rate table
  (`amount * (rates[target] / rates[base])`) — no extra network calls per
  keystroke or per base/target change
- `localStorage` for favorites, last-used base/target/basket, and the offline rate cache

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL. No API key or `.env` file needed.

```bash
npm run build    # production build to dist/
npm run preview  # preview the production build locally
npm test         # run the test suite once
npm run test:watch  # watch mode
```

## Project structure

```
src/
  data/currencyNames.js   # ISO 4217 code -> full name map, quick-pick list
  lib/
    api.js                  # fetchRates() + getCachedRates() — open.er-api.com + offline cache
    convert.js               # rateBetween()/convertAmount() — base-agnostic conversion math
    history.js                # fetchHistory() — frankfurter.dev 30-day series
    format.js                  # fmt(), rawNum() display formatters
    storage.js                  # namespaced localStorage helpers
  styles/tokens.js          # design tokens (palette, fonts)
  components/
    Ticker.jsx               # scrolling rate ticker strip (base-aware)
    AmountPanel.jsx            # "YOU HAVE" amount + from-currency picker
    CurrencySelect.jsx          # "CONVERT TO" panel — picker + favorites-aware chips
    CurrencyPicker.jsx            # shared searchable combobox w/ favorites (used by both panels)
    ResultPanel.jsx               # live converted result / loading / error / offline states
    HistoryChart.jsx                # 30-day sparkline
    Basket.jsx                       # multi-currency basket panel
  App.jsx                    # composes the above, owns state + persistence
  main.jsx                   # React entry point
  App.test.jsx              # component smoke tests
  test/setup.js               # Vitest + RTL setup
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
tests) is now built as of v1.2.0. Open ideas: PWA/installable offline mode,
push-based rate alerts, CSV export of the basket.

## Android app

Wrapped with [Capacitor](https://capacitorjs.com/) — the `android/` folder
is a generated native project (`npx cap add android` + `npx cap sync`), not
hand-maintained; the web app in `src/` remains the canonical source. A
built debug APK for sideloading lives in
[`releases/`](releases/ExchangeBoard-v1.2.0-debug.apk).

## License

No license specified yet.
