# ExchangeBoard — Galaxy Z Fold 5 build

**Branch:** `device/galaxy-z-fold5` (forked from `main` @ v1.4.0, not merged —
device-specific variant, not part of the mainline product).

## History

- **v1 (initial):** pure responsive-CSS layout tuning (see git history) —
  a two-column grid on the unfolded screen, tightened padding on the
  cover screen, no native code beyond a `versionName` bump.
- **v2 (this revision):** expanded scope on explicit request to "push the
  limits of what is possible with the hardware" — adds *real* native
  hinge-state detection (the piece v1 deliberately scoped out in favor of
  a fully-verifiable CSS-only approach) plus two cost-free, fully
  on-device "AI"/learning features. Everything below the `## v1` section
  is new in this revision.

## v1: responsive web layer

- **`src/styles/responsive.css`**, imported once in `src/main.tsx`. Pure
  CSS media queries — no JS layout logic, no resize listeners — so an
  actual fold/unfold event re-flows the WebView instantly via the
  browser's native CSS engine, with zero React re-render cost.
- **Cover screen (folded, ~344×882 CSS px):** the existing single-column
  stack already suits this narrow-tall aspect; `@media (max-width: 380px)`
  just tightens padding a little so it doesn't feel cramped.
- **Main screen (unfolded, ~884×736 CSS px):** `@media (min-width: 680px)`
  switches `.eb-container` from a flex column to a CSS Grid two-column
  layout (`grid-template-areas`) — "You Have" / "Convert To" side by
  side, the result banner full-width below, the history chart and
  favorites matrix side by side, the basket full-width, and (new in v2)
  the trend insight and currency quiz side by side underneath that.
- **`src/App.tsx`:** each top-level section has a stable `className`
  (`eb-header`, `eb-amount`, `eb-swap`, `eb-convert`, `eb-result`,
  `eb-history`, `eb-matrix`, `eb-basket`, `eb-insights`, `eb-quiz`,
  `eb-footer`) so the stylesheet can target it by `grid-area`, without
  touching any existing inline style *except* the outer content
  container: its `maxWidth`/`width`/`margin`/`padding`/`display`/
  `flexDirection` moved from inline style into `.eb-container` in the
  stylesheet, since an inline style can't be overridden by a plain
  (non-`!important`) media query — everything else keeps its original
  inline styling untouched.
- **`android/app/build.gradle`:** `versionName` suffixed `-fold5` so
  Settings > About shows which layout variant is installed. Same
  `applicationId` as the default build — install one variant per
  physical device, not side-by-side.

## v2: real hinge-state hardware integration

CSS media queries can only see viewport *size*. They cannot tell the
difference between a Fold5 fully unfolded flat and a Fold5 propped open at
~90° in tabletop/laptop posture ("flex mode") — both report the exact same
~884×736 viewport. Distinguishing them requires the platform's actual
hinge-angle sensor, which only a native bridge can expose. This revision
adds that bridge:

- **`android/app/src/main/java/.../FoldStatePlugin.java`** — a custom
  Capacitor plugin using Jetpack WindowManager's `FoldingFeature` API
  (`androidx.window:window` + `androidx.window:window-java` for the
  Java-friendly callback adapter, since the app module is plain Java —
  see `android/app/build.gradle`). Reports hinge `state` (`FLAT` /
  `HALF_OPENED`), `orientation` (`HORIZONTAL` / `VERTICAL`),
  `isSeparating`, and the hinge's actual pixel `bounds`, and emits a
  `foldStateChanged` event on every layout change.
- **`android/app/.../MainActivity.java`** now registers the plugin
  (`registerPlugin(FoldStatePlugin.class)` before `super.onCreate()`).
- **`src/lib/foldState.ts`** — the web-side bridge (`@capacitor/core`'s
  `registerPlugin`), with `isNativeFoldCapable()` gating every call:
  outside the native Android shell (a plain browser, iOS, a PWA install)
  everything degrades to a safe "no fold" default rather than throwing.
  `isFlexMode(state)` is the pure predicate for "half-opened, horizontal
  hinge" — the actual tabletop posture.
- **`src/hooks/useFoldState.ts`** — a small hook wrapping the above for
  `App.tsx`.
- **Flex-mode layout** (`src/styles/responsive.css` `.eb-container.flex-mode`,
  `.eb-flex-top`/`.eb-flex-bottom`): when `isFlexMode()` is true, `App.tsx`
  wraps the primary controls (header through result) in one region and
  the secondary content (history through the footer) in another, each a
  real DOM wrapper only in flex-mode (a `FlexGroup` helper renders a
  Fragment otherwise, so the existing wide-grid `grid-area` placement for
  the non-flex-mode case is untouched — grid-area only applies to a grid's
  *direct* children). The top region's height is set from
  `--hinge-top-fraction`, computed from the *actual* reported hinge
  `bounds.top`, not a guessed 50/50 split.
- **New dependencies**: `androidx.window:window:1.3.0`,
  `androidx.window:window-java:1.3.0` in `android/app/build.gradle`.

### ⚠️ Verification status for the native piece

Same caveat as the `device/galaxy-watch6-classic` branch, for the same
reason: **this was authored in a sandbox with no Android SDK and no
network access to `dl.google.com`** (403 at the proxy — a sandbox egress
policy, not a real outage). The Java is written carefully against a
long-stable, well-documented API (`FoldingFeature` has been stable since
Jetpack WindowManager 1.0), but it was not compiled, and the two dependency
versions couldn't be checked against the current Maven index. Build via
Android Studio (or `./gradlew assembleDebug`) and test flex mode on an
actual Fold5 (or the Android Studio foldable emulator profile, which does
simulate hinge-angle sensor events) before shipping.

## v2: on-device "AI" — trend insight & currency quiz

Explicitly scoped as **rudimentary and cost-free**: no external API calls,
no paid model, no backend (this project has none — see
`docs/MASTERFILE.md`). Both features are plain statistics/heuristics
running entirely in the browser/WebView, computed from data the app
already fetches or from the user's own local quiz history.

- **`src/lib/forecast.ts`** — ordinary least-squares linear regression
  over the same 30-day history `HistoryChart` already fetches, plus a
  moving average and a volatility (residual standard deviation) measure.
  `buildForecast()` turns those into a plain-English `insight` string and
  a `trend` classification (`rising`/`falling`/`flat`). The insight text
  always ends with an explicit disclaimer — *"On-device linear trend
  only -- not a financial forecast."* — this is a simple statistical
  summary of the past, not a prediction anyone should act on financially.
- **`src/components/Insights.tsx`** — renders that forecast, doing its
  own independent `fetchHistory(base, target, { days: 30 })` call rather
  than sharing `HistoryChart`'s internal state, to avoid touching a file
  shared with the other three open device/feature branches (lower merge-
  conflict risk). Both calls hit the same `lib/history.ts` cache key, so
  in practice there's no real duplicate network cost after the first
  fetch. Renders nothing for a same-currency pair or with too little
  history to say anything useful (same silent-when-inapplicable
  convention as `HistoryChart`/`Matrix`).
- **`src/lib/currencyQuiz.ts`** — "Currency IQ": a 4-option
  name-the-currency quiz over the full `CURRENCY_NAMES` catalog. The
  question-selection weighting (`weightFor`/`pickWeightedCode`) is the
  "rudimentary AI" here — not a neural network, just a simple miss-rate-
  weighted random draw (unseen codes get a flat head-start weight,
  frequently-missed codes get weighted up to 5x over a perfect-record
  code) that behaves a little like simplified spaced repetition without
  actually implementing a scheduling algorithm like SM-2.
- **`src/components/CurrencyQuiz.tsx`** — the UI; stats persist to
  `localStorage["exchangeboard:quizStats"]` (new key, additive, doesn't
  touch any existing persisted shape) so the adaptive weighting improves
  across sessions. Nothing is computed remotely or sent anywhere.

## Verification

- `npm run typecheck` / `npm test` (85/85, up from 48 — 37 new tests
  covering `forecast.ts`, `currencyQuiz.ts`, `foldState.ts`'s pure logic
  and browser-fallback behavior, `Insights.tsx`, and `CurrencyQuiz.tsx`)
  / `npm run build` + `npm run size-check` all pass. Bundle: ~62KB gzip,
  still well under the 300KB CI budget.
- Also applied here: the same `src/test/setup.ts` RTL auto-cleanup fix
  made independently on `feature/rate-alerts-basket-presets` (this branch
  forked from `main` before that landed, so it needed the fix too --
  without it, this branch's new multi-test component files would
  intermittently collide the same way).
- The native piece (`FoldStatePlugin.java`, the two new Gradle
  dependencies) is **not** verified — see the callout above.

## Try it without a Fold 5

- **Two-column layout:** resize a desktop browser window (or the Chrome
  DevTools device toolbar) across the ~680px breakpoint.
- **Flex mode:** can't be simulated in a browser at all — it's driven by
  a real hardware sensor with no web equivalent. Use the Android Studio
  foldable emulator profile (simulates hinge-angle sensor events) or a
  physical Fold5.
