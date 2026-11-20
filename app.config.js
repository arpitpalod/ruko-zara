// Adds the build-time version code to app.json. The Play Store needs a higher number on every upload;
// the sideloaded APK keeps 1 (it updates through its own banner, not the store).
module.exports = ({ config }) => ({
  ...config,
  android: { ...config.android, versionCode: Number(process.env.ANDROID_VERSION_CODE || 1) },
});
