# ExchangeBoard — engineering hardening (v1.6.0)

**Status:** merged into `main` as of v1.6.0.

Five systems, all aimed at the same thing: closing gaps between "the code
looks right" and "the code is actually verified correct," specifically for
the parts of this app that would fail silently rather than loudly if they
ever broke. Deliberately *not* included here: dependency vulnerability
scanning, Lighthouse/performance-score CI, E2E testing, release
automation — all real, but process/tooling maturity rather than
correctness guarantees for this app's specific promise (accurate math,
works offline, degrades honestly when an API misbehaves). Open follow-ups,
not gaps in this pass.

## 1. Runtime response validation (`src/lib/schemas.ts`)

Before this, every external API response was cast straight to its
TypeScript interface with `as` and trusted blindly:

```ts
const data = (await res.json()) as ErApiResponse;
```

TypeScript types are compile-time only — they enforce nothing about what
actually arrives over the wire. None of the three data sources this app
depends on (`open.er-api.com`, `api.frankfurter.dev`,
`api.coingecko.com`) are versioned or contractually stable; they're free,
keyless, best-effort public services. If any of them ever changed shape —
a renamed field, a `rates` value that's a string instead of a number, a
field dropped entirely — the bad data would have flowed straight into
`rateBetween()`/`convertAmount()` and shown up as a silent `NaN` or a
wrong number in the result panel, never a caught, explainable error.

[`zod`](https://zod.dev/) schemas now validate the actual shape of every
response before any of it is trusted — `erApiResponseSchema`,
`frankfurterResponseSchema`, `coinGeckoPriceResponseSchema`. They're
deliberately permissive about *extra* fields (zod objects ignore unknown
keys by default) and strict only about the shape this app actually reads,
so an API adding a field it doesn't touch yet is never a breaking change
here.

## 2. Typed error taxonomy (`src/lib/errors.ts`)

Before this, error handling was ad hoc and inconsistent across the three
fetch modules: some paths `throw new Error("bad response")` (a plain
string, untyped), others swallowed the failure entirely via a bare
`catch {}`. Nothing downstream could tell "the network is down" apart
from "the API is up but changed its response shape" — both just looked
like "something failed," even though they're genuinely different
problems with different implications (a network failure is expected and
already has a good fallback, the offline rate cache; an unexpected shape
means this app's assumptions about that API are now wrong).

`DataSourceError` is a discriminated union on `.kind`
(`"network" | "http" | "shape" | "empty"`), not a class hierarchy — an
exhaustive `switch` on `.kind` gets a compile error if a new variant is
ever added and a consumer forgets to handle it. Each carries a
`.userMessage` (short, honest, no jargon — safe to show directly) and a
`.message`/`.cause` for a future bug-report/diagnostics surface. `App.tsx`
now captures the specific `.userMessage` and threads it through to
`ResultPanel` instead of a single generic error string for every kind of
failure.

`src/lib/history.ts` (`fetchHistory`) is the one exception, deliberately:
it never throws, by design — "no history for this pair/window" is a
normal, expected outcome from a data source that only covers ~30
currencies, not a failure, and every existing caller (`Insights.tsx`,
`HistoryChart.tsx`) already relies on that contract. Schema validation
still adds real protection there even without changing the throw
contract: before this, a malformed response would have thrown a raw
`TypeError` from inside its `.map()` instead of degrading to the cache
like every other failure branch in that function already does.

## 3. IndexedDB schema versioning (`src/lib/db.ts`)

The IndexedDB `history_cache` store had zero schema versioning — if a
future change ever reshaped what gets stored under a `dbSet()` key (e.g.
`HistoryPoint` gaining or losing a field), an old-shaped cached record
would have silently read back as if it matched the new shape, pushing
defensive-parsing burden onto every caller instead of handling it once at
the storage layer.

`SCHEMA_VERSION` + a `schemaVersionMismatch()` check (run once per
session, memoized) now wipes the `history_cache` IndexedDB store whenever
the stamped version doesn't match — covering both "never versioned
before" (every session before this feature existed) and a real future
version bump identically. Scoped to IndexedDB only, deliberately: the
localStorage/memory fallback tiers below it are best-effort for when
IndexedDB is unavailable at all, not the primary store, and every reader
of this module already validates what it gets back regardless (e.g.
`fetchHistory`'s own `typeof point.rate === "number"` filter). The
decision logic (`schemaVersionMismatch`) is exported and unit-tested in
isolation from the actual IndexedDB wipe it gates, since jsdom (this
project's test environment) doesn't implement a real IndexedDB to test
that part against directly.

## 4. Accessibility testing (`jest-axe`)

Before this: three scattered `aria-label`s in the whole component tree,
no accessibility tooling at all, no CI gate — on an app people may use
for real money decisions. `jest-axe`'s `toHaveNoViolations()` matcher is
now registered globally (`src/test/setup.ts`, the same pattern
`@testing-library/jest-dom/vitest` already used there) and run against
the fully-composed, "ready"-state app in `App.test.tsx` — Ticker,
AmountPanel, CurrencySelect, ResultPanel, HistoryChart, Basket, Matrix,
Insights, CurrencyQuiz, Alerts, and OfflineBanner all render together
once rates load, so this one `axe()` pass covers the large majority of
the app's real interactive markup in a single run rather than needing a
duplicate per-component test everywhere. It's a normal part of
`npm test` now — the same CI gate that already catches a broken build or
a bundle-size regression catches an accessibility regression too.

## 5. Property-based testing (`fast-check`)

`rateBetween`/`convertAmount`/`applyMarkup` are pure functions previously
covered only by example-based tests — a handful of specific, human-picked
input/output pairs. Property-based tests instead state an invariant that
must hold for *every* valid input `fast-check` can generate, then search
for a counterexample across hundreds of random cases per run — the kind
of edge case ("what if a rate is 0.0001 and the amount is 999999999.7?")
a human writing examples by hand wouldn't think to try:

- `rateBetween` never returns `null`/`NaN`/non-finite for a fully
  populated, all-positive rates table
- `rateBetween(rates, X, X)` is always exactly `1`
- Round-trip: `rateBetween(rates, A, B) * rateBetween(rates, B, A) ≈ 1`
  for any two currencies present in the table
- `convertAmount` never produces `NaN`/non-finite for any finite amount
  against a valid table
- `convertAmount` scales linearly with the amount
- `applyMarkup` never increases the rate for any `markupPct` in `[0, 1]`
- `applyMarkup(rate, 0)` is the identity

## Verification

`npx tsc --noEmit` clean, `npx vitest run` — **125/125 passing** (up from
112: 2 new App-level tests — a shape-validation error case and the a11y
pass — 4 new `schemaVersionMismatch` unit tests, and 7 new property-based
test cases across `rateBetween`/`convertAmount`/`applyMarkup`, each
running hundreds of generated cases per `npm test` run but counted as one
test apiece in the "125"), production build + bundle-size check pass.
`zod` (a real runtime dependency, unlike the test-only additions —
`fast-check`/`jest-axe` are devDependencies) adds real weight: the main
bundle went from ~62.8KB to ~82.9KB gzip. Still well within the 300KB CI
budget (~217KB to spare), a cost worth paying for validating every
response this app trusts from three unversioned, best-effort external
services.
