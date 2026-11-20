#!/usr/bin/env bash
# Runs inside the Android emulator job: installs the demo APK, taps through the main screens with
# Maestro (e2e-android/screens.yaml) and leaves the screenshots in android-shots/.
set -uo pipefail

ROOT="${GITHUB_WORKSPACE:-$(pwd)}"
OUT="$ROOT/android-shots"
mkdir -p "$OUT"

adb install -r "$ROOT/android/app/build/outputs/apk/release/app-release.apk"

cd "$OUT"
touch "$OUT/.start"
status=0
maestro test --test-output-dir "$OUT/maestro" --debug-output "$OUT/debug" "$ROOT/e2e-android/screens.yaml" || status=$?

# Maestro's save folder for screenshots differs between versions: gather every new one here.
find "$ROOT" "$HOME/.maestro" -name '*.png' -newer "$OUT/.start" -not -path "$OUT/*.png" 2>/dev/null \
  | while read -r f; do cp -n "$f" "$OUT/$(basename "$f")"; done

# Whatever happened, keep the last screen and the app log for diagnosis.
adb exec-out screencap -p > "$OUT/zz-last-screen.png" || true
adb logcat -d -t 600 > "$OUT/logcat.txt" || true
ls -la "$OUT"
exit "$status"
