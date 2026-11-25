import { Platform } from 'react-native';

/**
 * Features being tried on the live site before everyone gets them. Opening the site once with the
 * feature's ?name=1 switches it on in that browser. The demo always has them.
 * - preview: the product preview under the shop link on the New form (25 Nov).
 */
const web = Platform.OS === 'web' && typeof window !== 'undefined';
const KEY = 'rz.previewBeta';

if (web && new URLSearchParams(window.location.search).get('preview') === '1') {
  try {
    window.localStorage.setItem(KEY, '1');
  } catch {
    // private mode etc.: just not switched on
  }
}

export function previewOn(isDemo: boolean): boolean {
  if (isDemo) return true;
  if (!web) return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
