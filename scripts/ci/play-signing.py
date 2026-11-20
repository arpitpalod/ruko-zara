"""Points the generated Android project's release build at the Play upload key.

Expo's generated android/app/build.gradle signs release builds with the debug key. For the Play Store the
release build must be signed with our upload key; its path and password come from the environment
(UPLOAD_STORE_FILE, UPLOAD_STORE_PASSWORD), so nothing secret is written into the file.
"""
import re
import sys

path = "android/app/build.gradle"
s = open(path).read()

release_cfg = """        release {
            storeFile file(System.getenv("UPLOAD_STORE_FILE"))
            storePassword System.getenv("UPLOAD_STORE_PASSWORD")
            keyAlias "upload"
            keyPassword System.getenv("UPLOAD_STORE_PASSWORD")
        }
"""
if "UPLOAD_STORE_FILE" not in s:
    s, n = re.subn(r"(signingConfigs\s*\{\n)", r"\1" + release_cfg.replace("\\", "\\\\"), s, count=1)
    if n != 1:
        sys.exit("signingConfigs block not found in build.gradle")

# Inside buildTypes { release { ... } }, use the release signing config instead of the debug one.
m = re.search(r"buildTypes\s*\{.*?release\s*\{(.*?)\n\s*\}", s, re.S)
if not m:
    sys.exit("release build type not found in build.gradle")
block = m.group(1)
if "signingConfigs.debug" not in block:
    sys.exit("release build type does not use the debug key as expected; check the generated build.gradle")
s = s[: m.start(1)] + block.replace("signingConfigs.debug", "signingConfigs.release", 1) + s[m.end(1) :]

open(path, "w").write(s)
print("release builds now signed with the upload key")
