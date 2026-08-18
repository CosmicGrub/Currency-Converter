# ExchangeBoard — Rate alerts & named basket presets

**Status:** merged into `main` as of v1.5.0 (originally developed on
`feature/rate-alerts-basket-presets`, combined with the Fold5 and Galaxy
Tab branches into one unified default build by request — see
`CHANGELOG.md`). Both items were on the app's public roadmap ("Open
ideas: push-based rate alerts...") and requested together in the
originating conversation.

## Named basket presets

Save the current basket's contents under a name, and load/delete saved
snapshots — e.g. keep an "Europe trip" basket and a "Crypto watch" basket
and swap the active basket's contents between them, instead of only ever
having one live basket.

- **Data model** (`src/types/index.ts`): `BasketPreset { id, name, codes }`,
  and `AppPrefs` grew a `basketPresets: BasketPreset[]` field.
- **Design choice — single active basket, not N simultaneous baskets.**
  `basket: string[]` (the field that already existed) stays exactly what
  it was: the one currently-active basket, read/written by all the same
  code as before. Presets are just named snapshots you can save into or
  load back onto that single active basket — simpler than tracking
  several simultaneously-live baskets, and it's the more common mental
  model ("save this configuration", "load that one").
- **`SAVE_BASKET_PRESET` always snapshots the reducer's own current
  `basket`**, not a `codes` array handed back up from the component —
  `Basket.tsx`'s `onSavePreset` prop takes just a `name: string`, so
  there's no risk of a stale `codes` array racing the reducer's actual
  state.
- UI lives inside the existing `Basket.tsx` panel: a "Save as preset"
  button (only shown once the basket has at least one currency) opens a
  name prompt; saved presets show as removable chips that load on click.

## Rate alerts

Set a threshold on any pair ("notify when 1 USD = EUR goes above 0.90")
and see it in the new **Alerts** panel, with a browser notification as a
bonus channel.

- **Data model:** `RateAlert { id, base, target, direction, threshold,
  enabled, triggered }` in `src/types/index.ts`; `AppPrefs` grew an
  `alerts: RateAlert[]` field. `triggered` is hysteresis state: true once
  an alert has fired for the current crossing, silently reset once the
  rate moves back to the armed side, so a rate hovering right at the
  threshold doesn't spam repeat notifications.
- **Pure crossing logic** lives in `src/lib/alerts.ts`
  (`currentAlertRate`, `isThresholdCrossed`), independent of the
  component, so it's directly unit-testable.
- **`src/components/Alerts.tsx`** is self-contained: it re-evaluates every
  enabled alert whenever its `rates` prop changes, always shows each
  alert's live status in-app (current rate, "🔔 Triggered" badge)
  regardless of notification permission, and calls the new
  `src/lib/notify.ts` wrapper (`Notification` API, feature-detected,
  never throws) as a bonus channel for when the tab isn't focused.
- **`App.tsx`:** `loadRates()` gained a `{ silent }` option — a silent
  call never flips the UI to "loading" (no flicker) and never flips a
  working UI to "error" on a transient failure with no cache to fall
  back to. A new effect runs a 5-minute interval calling
  `loadRates({ silent: true })` **only while at least one alert is
  enabled** — no extra API polling for users not using alerts.

### ⚠️ Scope: foreground/open-app alerts, not background push

This is a deliberate, honest scope choice, not an oversight. The project
has **no backend** (see `docs/MASTERFILE.md` — "no backend, no DB
required"), and true background alerts when the browser/app is fully
closed would need either a server-side push trigger or a native
background job:

- **What this branch does:** re-checks alert thresholds every 5 minutes
  while the app is open (foreground or a backgrounded-but-still-alive
  browser tab), and fires an in-app status update plus an optional
  browser `Notification`.
- **What it does *not* do:** wake up and notify you if the app/browser is
  fully closed. Web Periodic Background Sync exists but has narrow
  browser support (no iOS Safari at all) and OS-throttled intervals too
  coarse to be a real "rate alert."
- **A real background-capable option exists as a natural follow-up, not
  built here:** the Android shell (`android/app`) already has two
  precedents for independent native background fetches outside the
  WebView — the home-screen widget and the Wear OS companion (see
  `CHANGELOG.md`). A native `WorkManager` job doing the same threshold
  check + a system notification would give Android users real background
  alerts without needing a backend, matching that existing pattern. It
  wasn't built in this pass because it's native Kotlin work of similar
  size to the Watch6 Classic branch — flagging it explicitly rather than
  building it unasked, the same reasoning applied there.

## Verification

`npm run typecheck` / `npm test` (75/75, up from 48 -- 27 new tests
covering `alerts.ts`, the reducer's new actions, `Alerts.tsx`, and
`Basket.tsx`'s preset UI) / `npm run build` + `npm run size-check` all
pass (~59KB gzip, still well under the 300KB CI budget).

Also fixed along the way: `src/test/setup.ts` was missing an explicit
`afterEach(cleanup)` for `@testing-library/react` — with this project's
`vitest.config.ts` `globals: false` setting, RTL's own auto-cleanup
detection never fires, so rendered components were silently accumulating
in `document.body` across tests within a file. Only surfaced as a visible
failure once two tests in the same file queried genuinely-duplicate text
(two `Alerts` tests both rendering an "On" button) — a latent gap in the
existing test infrastructure, not something specific to this feature, now
fixed for every test file going forward.

Backward compatible: `prefs` is read via `{ ...defaultPrefs, ...loadJSON(...) }`
(a merge, not a replace), so an older saved `prefs` blob missing
`basketPresets`/`alerts` gets those fields defaulted to `[]` instead of
crashing at `undefined.push(...)` — every existing field
(`base`/`target`/`favorites`/`basket`) round-trips exactly as before.
