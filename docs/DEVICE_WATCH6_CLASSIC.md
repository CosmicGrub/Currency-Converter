# ExchangeBoard — Galaxy Watch6 Classic build

**Status:** merged into `main` as of v1.5.0 (originally developed on
`device/galaxy-watch6-classic`; this one merged cleanly with no conflicts
since it only touches `android/wear/`, isolated from the phone/tablet web
layer). Everything below still describes exactly what this code does.

## What's different from `main`

Native Kotlin/Wear OS work in `android/wear/` (the standalone Wear OS
module — a real Tile + companion activity, not a WebView port of the phone
app). All four requested enhancements are included:

- **Rotary bezel input.** `MainActivity` now overrides
  `onGenericMotionEvent()` and scrolls its rate list in response to
  `MotionEvent.AXIS_SCROLL` from `InputDevice.SOURCE_ROTARY_ENCODER` — the
  standard, unified Wear OS rotary input API (the same one the Pixel
  Watch's crown uses), wired up specifically because the Classic's
  *physical* rotating bezel is its signature interaction. The rate list
  itself grew from a hardcoded 3 currencies to 12
  (`RateFetcher.QUICK_CODES`) so there's actually something to scroll
  through; it now lives in a `ScrollView` instead of three fixed
  `TextView`s.
- **Ambient / always-on-display mode.** `MainActivity` implements
  `AmbientModeSupport.AmbientCallbackProvider`; entering ambient flattens
  the UI to a near-monochrome, no-accent-color palette (standard Wear OS
  ambient guidance for battery/OLED-burn-in reasons) and re-renders from
  the local cache only — never a network fetch — on each
  `onUpdateAmbient()` tick (~once a minute, per the platform's ambient
  budget).
- **Watch-face complication.** New `RateComplicationService.kt`
  (`ComplicationDataSourceService`, `SHORT_TEXT` type) shows the top
  cached rate directly on the watch face; tapping it opens
  `MainActivity`. Reads the same `SharedPreferences` cache the Tile
  already reads/writes — it doesn't fetch independently, since
  complications refresh far too rarely (`UPDATE_PERIOD_SECONDS`, set to
  1 hour) for that to be worthwhile.
- **Round-screen polish.** `activity_main.xml`'s root swapped from a
  plain `FrameLayout` to `androidx.wear.widget.BoxInsetLayout`
  (`app:layout_box="all"`) — the standard Wear OS jetpack widget for
  keeping content inside a circular display's safe area, rather than
  hand-tuned padding.
- **The Tile stays glanceable.** `RateTileService` still shows only 3
  rows (`.take(3)` off the now-longer `RateFetcher` list) — a Tile that
  needs scrolling would defeat the point of a Tile; the full 12-currency
  scrollable list lives in the companion activity.
- `android/wear/build.gradle`: two new dependencies
  (`androidx.wear:wear-ambient:1.0.1` for ambient mode,
  `androidx.wear.watchface:watchface-complications-data-source-ktx:1.2.1`
  for complications) and a `-watch6classic` `versionName` suffix.

## ⚠️ Verification status — please read before building

This branch was authored in a sandbox with **no Android SDK and no
network access to `dl.google.com`** (blocked by the sandbox's egress
policy — confirmed via a 403 at the proxy, not a real outage). That means:

- **Nothing here was compiled.** The Kotlin/XML is written carefully
  against long-stable, well-documented Wear OS APIs (rotary input,
  `AmbientModeSupport`, `ComplicationDataSourceService`,
  `BoxInsetLayout`) that I'm confident in structurally, but there was no
  way to catch a typo, an API surface drift, or a Gradle resolution
  failure before you build it.
- **The two new dependency versions (`wear-ambient:1.0.1`,
  `watchface-complications-data-source-ktx:1.2.1`) could not be checked
  against the current Google Maven index.** Please verify (or let
  Android Studio's dependency resolution / "Upgrade" suggestions do it)
  before building — bump if either is stale or unresolvable.
- **First real build should happen in Android Studio** (or
  `./gradlew :wear:assembleDebug` with a full Android SDK available) —
  fix anything that surfaces there, then sideload to a Watch6 Classic
  (or the Wear OS emulator with a round, bezel-equipped profile) to
  confirm the rotary input actually feels right in hand — that's not
  something any of this can be verified from source alone.

The rest of the repo (the web app, the other two device branches) went
through `npm run typecheck` / `npm test` / `npm run build` — this branch's
native code is the one exception, for the reasons above.
