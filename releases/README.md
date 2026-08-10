# ExchangeBoard — Android builds

Debug APKs built from this branch via [Capacitor](https://capacitorjs.com/),
wrapping the `dist/` web build from `main`. Not signed for release — for
sideloading/testing only.

## Install

```bash
adb install -r ExchangeBoard-v1.2.0-debug.apk
```

## Rebuild from source

The `android/` project in this branch is generated from the web app
(`npx cap add android` + `npx cap sync android`), not hand-maintained — if
the web app changes, regenerate rather than hand-editing native files.

```bash
npm install
npm run build
npx cap sync android
cd android
JAVA_HOME="<path to a JDK 21>" ./gradlew assembleDebug
# output: android/app/build/outputs/apk/debug/app-debug.apk
```

Built/tested against:
- App ID: `com.cosmicgrub.exchangeboard`
- JDK 21 (Android Gradle Plugin in this Capacitor version requires it — a
  JDK 17 `JAVA_HOME` fails with `invalid source release: 21`; Android
  Studio's bundled JBR works if you don't have a standalone JDK 21)
- Android SDK platforms 34–36, build-tools 34–36

## Device history

| Date | Device | Result |
|---|---|---|
| 2026-08-09 | Samsung Galaxy Z Fold 5 (`SM-F946U`, ADB serial `RFCW80CK2RW`) | Installed and launched successfully via `adb install -r` |
