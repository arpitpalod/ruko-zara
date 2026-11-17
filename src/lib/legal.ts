import { Linking } from 'react-native';

/** Public legal pages (public/*.html, published with the web app). */
const BASE = 'https://arpitpalod.github.io/ruko-zara';

export const LEGAL = {
  privacy: `${BASE}/privacy.html`,
  terms: `${BASE}/terms.html`,
  grievance: `${BASE}/privacy.html#grievance`,
};

export const openLink = (url: string) => {
  Linking.openURL(url).catch(() => {});
};
