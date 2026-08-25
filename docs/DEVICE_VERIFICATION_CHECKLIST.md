# ExchangeBoard — device verification checklist

What's automatically verified today, and exactly what's still left for a
human with real hardware (or a full Android Studio emulator session) to
confirm. Written so that step can be fast and complete rather than
rediscovered from scratch — check items off in order, top to bottom.

## What CI already proves, as of v1.6.1

Three layers, each catching a different class of bug:

1. **Compiles** (`android` job, `.github/workflows/ci.yml`) —
   `:app:assembleDebug` / `:wear:assembleDebug` on a real Android SDK.
   Caught 5 real bugs on its first week existing: a wrong import package,
   a nonexistent Gradle dependency, illegal XML comment syntax, a stale
   pre-AndroidX attribute name, and a wrong Activity base class — see
   `docs/DEVICE_FOLD5.md` and `docs/DEVICE_WATCH6_CLASSIC.md` for each.
2. **Runs without crashing** (`instrumented-app` / `instrumented-wear`
   jobs) — launches the real `MainActivity` on a real (emulated) Android/
   Wear OS runtime via `reactivecircus/android-emulator-runner`, not just
   compiling it. This is what actually exercises `FoldStatePlugin.load()`
   (the `WindowInfoTracker`/`WindowInfoTrackerCallbackAdapter` wiring) and
   Wear's `AmbientModeSupport.attach()` at runtime for the first time —
   compiling successfully doesn't mean a class loads or a method doesn't
   throw. See `android/app/src/androidTest/.../MainActivityLaunchTest.java`
   and `android/wear/src/androidTest/.../MainActivityLaunchTest.kt`.
3. **Web layer** (`test`/`build` jobs) — typecheck, lint, 125 unit/
   component/property-based tests, production build, bundle-size budget.
   Fully verified, not device-specific.

**What none of this can reach:** the emulator profiles CI uses are
deliberately standard, non-foldable ones (see the `instrumented-app`
job's comment in `ci.yml` for why) — they prove the native bridge
initializes and runs cleanly, not that a real folding hinge, a physical
rotary crown, or an actual always-on OLED display behaves a specific way.
That's what this checklist is for.

## Galaxy Z Fold 5

Needs: a real Fold5, **or** Android Studio's foldable emulator profile
("7.6in Foldable" / Pixel Fold in the Device Manager — this does simulate
hinge-angle sensor events, unlike CI's standard profile).

- [ ] **Cover screen (folded).** Single-column layout, readable, nothing
      clipped at ~344×882 CSS px.
- [ ] **Unfolded flat.** Two-column grid layout ("You Have"/"Convert To"
      side by side, history + matrix side by side, insights + quiz side
      by side underneath).
- [ ] **Flex mode (propped open ~90°, tabletop/laptop posture).** This is
      the one behavior nothing but real hinge hardware (or the Studio
      foldable profile) can produce: primary controls on top, secondary
      content below, split at the *actual* reported hinge position
      (`--hinge-top-fraction`) — not a fixed 50/50. Confirm the split
      position visibly tracks where the physical hinge actually is, not
      just that a split happens at all.
- [ ] **Fold/unfold transitions.** Rotate/fold/unfold while the app is
      open — layout should reflow live, no crash, no stuck stale layout.
- [ ] **On-device AI panels** (trend insight, Currency IQ quiz) render
      correctly in both the two-column and flex-mode layouts.
- [ ] Confirm `docs/DEVICE_FOLD5.md`'s description of flex-mode behavior
      still matches what you actually see — update it if not.

## Galaxy Tab

Needs: a real Galaxy Tab, **or** a large-tablet emulator profile (e.g.
"Pixel Tablet") — no fold-sensor hardware required, this tier is pure CSS
breakpoints.

- [ ] **Portrait and landscape**, both already wider than a phone's
      landscape — two-column grid should apply in both.
- [ ] **1024px+ extra-wide tier** — more breathing room, ~5% larger type,
      on an 11"+ tablet specifically (Tab S9+/S9 Ultra or similar).
- [ ] **Split-screen/multi-window** — shrink the app's share of the
      screen down to phone-narrow width; the `max-width: 380px` fallback
      should kick in instead of a broken wide layout squeezed too small.

## Galaxy Watch6 Classic

Needs: a real Watch6 Classic, **or** a round, bezel-equipped Wear OS
emulator profile in Android Studio (CI's `instrumented-wear` job proves
the app *launches* on a round Wear OS runtime, but a headless CI emulator
has no physical bezel to turn).

- [ ] **Physical rotary bezel** actually scrolls the rate list — confirm
      it feels immediate/responsive, not just that it technically
      registers `MotionEvent.AXIS_SCROLL` events. Compare the "rotate
      down = list scrolls down" direction feels natural in hand, not
      inverted.
- [ ] **Ambient / always-on-display mode.** Lower the wrist (or wait for
      the system to enter ambient) — palette should flatten to
      near-monochrome, no saturated accent color. Confirm it re-renders
      from cache roughly once a minute without ever making a network
      call while ambient (check `adb logcat` or a network-usage tool if
      available — this is a real platform-guideline requirement, not
      just cosmetic).
- [ ] **Watch-face complication.** Add a complication-aware watch face,
      set one of its slots to ExchangeBoard, confirm a live rate actually
      renders there and tapping it opens the companion activity.
- [ ] **Tile.** Add via the tile carousel, confirm the glanceable 3-row
      view renders and updates.
- [ ] **Round-screen safe area** (`BoxInsetLayout`/`layout_boxedEdges`) —
      confirm nothing is visually clipped by the circular bezel at the
      screen's edges.

## After completing any section

Update the corresponding device doc (`docs/DEVICE_FOLD5.md`,
`docs/DEVICE_TABLET.md`, `docs/DEVICE_WATCH6_CLASSIC.md`) to say what was
actually confirmed and when, the same way `docs/BUILD_STEPS.md` and the
CI docs already track verification status elsewhere in this project —
this checklist should shrink over time, not stay static.
