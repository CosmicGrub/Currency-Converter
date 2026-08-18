# ExchangeBoard — Galaxy Tab build

**Branch:** `device/galaxy-tab` (forked from `main` @ v1.4.0, not merged —
device-specific variant, not part of the mainline product).

## What's different from `main`

Purely a responsive **web-layer** change, same approach as the
`device/galaxy-z-fold5` branch — pure CSS media queries, no JS layout
logic, fully verifiable without a physical device or emulator. Nothing
about conversion logic, data sources, or persisted state changed.

- **New `src/styles/responsive.css`**, imported once in `src/main.tsx`.
- **`@media (min-width: 680px)`:** `.eb-container` switches from a flex
  column to a CSS Grid two-column layout (`grid-template-areas`) — "You
  Have" / "Convert To" side by side, the result banner full-width below,
  the history chart and favorites matrix side by side, the basket
  full-width at the bottom. A Galaxy Tab is wide in *both* orientations
  (portrait is already wider than a phone's landscape), so this applies
  essentially all the time, not just past a fold hinge.
- **`@media (min-width: 1024px)`:** large tablets (Tab S9/S9+/S9 Ultra,
  11-14") get extra breathing room (wider max-width, larger gaps) and a
  ~5% type-size bump, since content held at typical tablet viewing
  distance otherwise reads a little small relative to the display.
- **`@media (max-width: 380px)`:** a defensive fallback for split-screen/
  multi-window tablet multitasking, which can shrink the app's share of
  the screen down to phone-narrow widths even on a tablet-class device.
- **`src/App.tsx`:** same structural change as the Fold5 branch — each
  top-level section got a stable `className` for `grid-area` targeting;
  the container's `maxWidth`/`width`/`margin`/`padding`/`display`/
  `flexDirection` moved from inline style into `.eb-container` in the
  stylesheet (an inline style can't be overridden by a plain,
  non-`!important` media query); everything else is untouched.
- **`android/app/build.gradle`:** `versionName` suffixed `-tab` so
  Settings > About shows which layout variant is installed. Same
  `applicationId` as the default build — install one variant per
  physical device, not side-by-side.

## Verification

- `npm run typecheck` / `npm test` (48/48) / `npm run build` +
  `npm run size-check` all pass — the web layer is fully verified.
- The `android/app` Capacitor shell itself is unchanged beyond the
  `versionName` bump — no native code was touched. This wasn't compiled
  in the sandbox this branch was authored in (no Android SDK available
  there); build normally via Android Studio / `./gradlew assembleDebug`
  before installing.

## Try it without a Tab

Resize a desktop browser window (or the Chrome DevTools device toolbar,
e.g. a "Galaxy Tab S9" preset) past the 680px and 1024px breakpoints —
the exact same media queries drive both the real device and a plain
window resize.
