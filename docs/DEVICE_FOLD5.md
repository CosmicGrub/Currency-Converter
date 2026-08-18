# ExchangeBoard — Galaxy Z Fold 5 build

**Branch:** `device/galaxy-z-fold5` (forked from `main` @ v1.4.0, not merged —
device-specific variant, not part of the mainline product).

## What's different from `main`

Purely a responsive **web-layer** change (see the questionnaire in the
originating conversation — deeper native fold-state detection via Jetpack
`WindowManager` was explicitly scoped out in favor of this, since it's
fully verifiable without a physical device or emulator). Nothing about
conversion logic, data sources, or persisted state changed.

- **New `src/styles/responsive.css`**, imported once in `src/main.tsx`.
  Pure CSS media queries — no JS layout logic, no resize listeners — so
  an actual fold/unfold event re-flows the WebView instantly via the
  browser's native CSS engine, with zero React re-render cost.
- **Cover screen (folded, ~344×882 CSS px):** the existing single-column
  stack already suits this narrow-tall aspect; `@media (max-width: 380px)`
  just tightens padding a little so it doesn't feel cramped.
- **Main screen (unfolded, ~884×736 CSS px):** `@media (min-width: 680px)`
  switches `.eb-container` from a flex column to a CSS Grid two-column
  layout (`grid-template-areas`) — "You Have" / "Convert To" side by
  side, the result banner full-width below, the history chart and
  favorites matrix side by side, the basket full-width at the bottom.
- **`src/App.tsx`:** each top-level section got a stable `className`
  (`eb-header`, `eb-amount`, `eb-swap`, `eb-convert`, `eb-result`,
  `eb-history`, `eb-matrix`, `eb-basket`, `eb-footer`) so the stylesheet
  can target it by `grid-area`, without touching any existing inline
  style *except* the outer content container: its `maxWidth`/`width`/
  `margin`/`padding`/`display`/`flexDirection` moved from inline style
  into `.eb-container` in the stylesheet, since an inline style can't be
  overridden by a plain (non-`!important`) media query — everything else
  keeps its original inline styling untouched.
- **`android/app/build.gradle`:** `versionName` suffixed `-fold5` so
  Settings > About shows which layout variant is installed. Same
  `applicationId` as the default build — install one variant per
  physical device, not side-by-side.

## Verification

- `npm run typecheck` / `npm test` (48/48) / `npm run build` +
  `npm run size-check` all pass — the web layer is fully verified.
- The `android/app` Capacitor shell itself is unchanged beyond the
  `versionName` bump — no native code was touched, so the existing
  Android build process applies as-is. This wasn't compiled in the
  sandbox this branch was authored in (no Android SDK available there);
  build normally via Android Studio / `./gradlew assembleDebug` before
  installing.

## Try it without a Fold 5

Resize a desktop browser window (or the Chrome DevTools device toolbar)
across the ~680px breakpoint — the exact same media query drives both the
real hinge and a plain window resize.
