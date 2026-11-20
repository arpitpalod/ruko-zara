import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Where someone first came from, so we can tell which channel brings people who post.
 * Taken from the link they opened (?src=ig, or utm_source), else guessed from the site that sent
 * them. Kept on the phone until they have an account, then saved once on their profile (never
 * overwritten; nobody can read it through the app).
 */
const KEY = 'rz.src';
const SENT = 'rz.srcSent';
const OK = /^[a-z0-9-]{2,32}$/;

/** Sites that send people without a tagged link. */
const REFERRERS: [RegExp, string][] = [
  [/(^|\.)reddit\.com$/, 'reddit'],
  [/(^|\.)instagram\.com$/, 'ig'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'yt'],
  [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, 'li'],
  [/(^|\.)threads\.(net|com)$/, 'threads'],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, 'wa'],
  [/(^|\.)facebook\.com$/, 'fb'],
  [/(^|\.)ycombinator\.com$/, 'hn'],
  [/(^|\.)peerlist\.io$/, 'peerlist'],
  [/(^|\.)google\.[a-z.]+$/, 'google'],
];

/** The source this page was opened with, or null. Pure, so it can be tested. */
export function sourceFrom(search: string, referrer: string, ownHost: string): string | null {
  const q = new URLSearchParams(search);
  const tagged = (q.get('src') || q.get('utm_source') || '').trim().toLowerCase();
  if (OK.test(tagged)) return tagged;
  let host = '';
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : '';
  } catch {
    return null;
  }
  if (!host || host === ownHost) return null;
  for (const [re, code] of REFERRERS) if (re.test(host)) return code;
  return null;
}

/** On the website: remember the first source seen on this phone. */
export async function rememberSource(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const src = sourceFrom(window.location.search, document.referrer, window.location.hostname);
  if (!src) return;
  try {
    if (!(await AsyncStorage.getItem(KEY))) await AsyncStorage.setItem(KEY, src);
  } catch {
    // Storage blocked (private mode): we just won't know.
  }
}

/** Saves the remembered source on the profile, once per phone. */
export async function sendSourceOnce(save: (src: string) => Promise<void>): Promise<void> {
  try {
    if (await AsyncStorage.getItem(SENT)) return;
    const src = await AsyncStorage.getItem(KEY);
    if (!src) return;
    await save(src);
    await AsyncStorage.setItem(SENT, '1');
  } catch {
    // Try again next launch.
  }
}
