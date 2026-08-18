# ExchangeBoard — build & install steps, per device

As of v1.5.0, **every device builds from the same `main` branch and the
same `android/app` module** — there are no more per-device branches or
variants to choose between (see `CHANGELOG.md` for why: PRs #3 and #5
conflicted with the already-merged Fold5 PR, so all three were combined
into one unified default build rather than kept as separate installs).
Device-specific behavior (Fold5 flex mode, the extra-wide tablet CSS
tier, the hinge-state plugin) all detect their own hardware at runtime
and degrade to safe no-ops everywhere else.

The **Wear OS companion** (Watch6 Classic) is the one real exception —
it's a separate Gradle module (`android/wear`) with its own
`applicationId`, built and installed independently of the phone/tablet
app.

This doc is install/deploy instructions only. For what each device's
code actually does, see `docs/DEVICE_FOLD5.md`, `docs/DEVICE_TABLET.md`,
and `docs/DEVICE_WATCH6_CLASSIC.md`.

## ⚠️ Before you build: verification status

**CI now compiles both native modules on every push** (the `android` job
in `.github/workflows/ci.yml` — `:app:assembleDebug` and
`:wear:assembleDebug` on a GitHub-hosted runner, which has a real Android
SDK and full internet access, unlike the sandbox this code was originally
authored in). That closes the biggest gap: a typo, an API surface drift,
or a stale Gradle dependency version now fails CI instead of shipping
silently. Check the `android` job's status on the commit/PR you care
about before treating any given revision as "compiles clean."

What CI **can't** check, because it's headless and has no device or
emulator attached:

- `FoldStatePlugin.java` (Fold5 hinge detection) — that it actually
  receives real `FoldingFeature` events and the flex-mode split looks
  right on real hardware
- The Wear OS additions in `android/wear/` (rotary input, ambient mode,
  the complication service) — that rotary scrolling feels right, ambient
  mode's palette/redraw timing looks correct, and the complication
  actually renders on a watch face

**Your first *hardware* check of each module should still happen on a
real device or a matching emulator profile** (Android Studio's foldable
profile for flex mode, a round Wear OS profile for the watch) — CI proves
the code builds, not that it behaves correctly at runtime. Everything
in `src/` (the actual web app) is unaffected by any of this and is
fully verified — see the Verification section in each device doc and in
`CHANGELOG.md`.

## Common setup (once)

```bash
git clone https://github.com/CosmicGrub/Currency-Converter.git
cd Currency-Converter
git checkout main
npm install
npm run build          # tsc --noEmit + vite build -> dist/
npx cap sync android    # copies dist/ into the Capacitor Android shell
```

Then open `android/` as a project in Android Studio (`File > Open`,
point at the `android/` folder — not the repo root). Let it finish an
initial Gradle sync before doing anything else; that sync is also your
first native-compile check.

If you'd rather stay on the command line, `android/gradlew` works from
inside `android/` for every command below — just prefix with `./gradlew`
and drop the Android Studio steps.

---

## Galaxy Z Fold 5

Builds the default `app` module — no special flags. The flex-mode layout
and hinge-state plugin activate automatically when `FoldStatePlugin`
detects Jetpack WindowManager `FoldingFeature` events; on any device
without a hinge sensor, `isNativeFoldCapable()` returns `false` and the
app behaves exactly like the plain responsive-web layout.

```bash
cd android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Or in Android Studio: select the `app` run configuration, pick your
connected Fold5 as the target device, and hit Run.

**To actually see flex mode**, you need one of:
- A **real Galaxy Z Fold 5**, propped open at roughly 90° (tabletop/
  laptop posture) — plug it in via USB with Developer Options + USB
  debugging enabled, and `adb devices` should list it before you deploy.
- The **Android Studio foldable emulator profile** ("Pixel Fold" or the
  "7.6in Foldable" profile in the Device Manager) — it simulates
  hinge-angle sensor events, so `FoldingFeature` reporting works even
  without physical hardware. A plain phone/tablet emulator will never
  report a `FoldingFeature` at all, since it has no hinge to simulate.

Cover-screen and unfolded-flat layouts are pure CSS media queries and
render correctly in any browser or emulator regardless of fold-sensor
support — only the tabletop/laptop *flex-mode* split needs one of the
two options above.

## Galaxy Tab

Same `app` module, same command as Fold5 — there is no separate tablet
build target. The extra-wide `@media (min-width: 1024px)` CSS tier
activates purely by viewport width, so it applies to any large tablet
(Tab S9/S9+/S9 Ultra, 11-14"), not just a specific model.

```bash
cd android
./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

No fold-sensor hardware or special emulator profile needed — any
tablet-class device or a standard large-tablet emulator profile in
Android Studio (e.g. "Pixel Tablet") shows the real layout, since it's
driven entirely by CSS breakpoints.

## Galaxy Watch6 Classic

**Different module** — build and install `:wear`, not `:app`. It has its
own `applicationId` (`com.cosmicgrub.exchangeboard.wear`) and installs
alongside the phone app without conflicting with it.

```bash
cd android
./gradlew :wear:assembleDebug
adb -s <watch-serial> install -r wear/build/outputs/apk/debug/wear-debug.apk
```

Find `<watch-serial>` with `adb devices` once the watch is paired for
debugging (Developer Options > ADB debugging, plus Wi-Fi debugging or a
Bluetooth/Wi-Fi ADB pairing from the paired phone — Watch6 Classic has no
USB port). In Android Studio, select the `wear` run configuration and
pick the paired watch (or a Wear OS emulator, e.g. "Wear OS Large Round")
as the target.

After installing:
- The **Tile** (glanceable rates) needs to be added manually — swipe to
  the tile carousel on the watch and add it from the list, same as any
  Wear OS tile; installing the APK alone doesn't surface it.
- The **watch-face complication** needs a complication-aware watch face —
  open watch face settings, edit complications, and pick ExchangeBoard
  from the list for whichever slot you want the rate in.
- **Ambient mode** and **rotary bezel scrolling** both work immediately
  in the companion activity once it's installed — no extra setup.

A prebuilt debug APK from an earlier revision is checked into
`releases/ExchangeBoard-Wear-debug.apk` for reference, but it predates
the v1.5.0 rotary/ambient/complication work — build fresh from `main`
rather than sideloading that one.

---

## Everything else (phone/tablet, no specific device)

The same `app` module build above works for any Android phone or tablet —
that's the point of the v1.5.0 unification. Device-specific features
simply don't activate on hardware that doesn't have the sensor/screen
size for them; there's no separate "generic" build to maintain.

## Web-only (no Android build at all)

The web app itself needs none of the above — `npm run dev` / `npm run
build` + `npm run preview` runs and installs as a PWA in any modern
mobile or desktop browser, offline-capable after the first visit. This
is the fastest way to try the responsive layout tiers (resize the
browser window, or use your browser's device-emulation panel) without
touching Android Studio at all — it just can't show real hinge-sensor
flex mode or any of the native Wear OS pieces, which have no web
equivalent.
