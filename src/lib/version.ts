import { Platform } from 'react-native';
import { ANDROID_APK } from './legal';

/**
 * Android installs come from a download link, not a store, so the app tells people when a newer build exists.
 * Each build stamps its time (EXPO_PUBLIC_APP_BUILD) into the app and publishes the same number in version.json
 * next to the APK.
 */
export const APP_BUILD = Number(process.env.EXPO_PUBLIC_APP_BUILD || 0);
export const VERSION_URL = ANDROID_APK.replace(/[^/]+$/, 'version.json');

export const isNewer = (remote: unknown, local: number) => typeof remote === 'number' && local > 0 && remote > local;

/** True if a newer Android build is available. Never throws; false on web, dev builds or no internet. */
export async function updateAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android' || !APP_BUILD) return false;
  try {
    const res = await fetch(`${VERSION_URL}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!res.ok) return false;
    const v = await res.json();
    return isNewer(v?.build, APP_BUILD);
  } catch {
    return false;
  }
}
