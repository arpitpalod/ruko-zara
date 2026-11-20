#!/usr/bin/env bash
# Runs inside the Android emulator job: installs the demo APK, taps through the main screens with
# Maestro (e2e-android/screens.yaml) and leaves the screenshots in android-shots/.
set -uo pipefail

ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
OUT="$ROOT/android-shots"
mkdir -p "$OUT"

adb install -r "$ROOT/android/app/build/outputs/apk/release/app-release.apk"

cd "$OUT"
status=0
maestro test --debug-output "$OUT/debug" "$ROOT/e2e-android/screens.yaml" || status=$?

# Whatever happened, keep the last screen and the app log for diagnosis.
adb exec-out screencap -p > "$OUT/zz-last-screen.png" || true
adb logcat -d -t 600 > "$OUT/logcat.txt" || true
ls -la "$OUT"
exit "$status"
