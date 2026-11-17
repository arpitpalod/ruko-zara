import { Linking } from 'react-native';

/** Public legal pages (public/*.html, published with the web app). */
export const WEB_BASE = 'https://arpitpalod.github.io/ruko-zara';
const BASE = WEB_BASE;

/** Latest Android build (GitHub Actions publishes it on every update). */
export const ANDROID_APK = 'https://github.com/arpitpalod/ruko-zara/releases/download/android-latest/app-release.apk';

export const LEGAL = {
  privacy: `${BASE}/privacy.html`,
  terms: `${BASE}/terms.html`,
  grievance: `${BASE}/privacy.html#grievance`,
};

export const openLink = (url: string) => {
  Linking.openURL(url).catch(() => {});
};
