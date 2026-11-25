import { Platform } from 'react-native';

/**
 * Google sign-in leaves the site and comes back with a full page load, so a few things are kept in
 * the browser across that trip (web only; the phone app doesn't offer Google yet):
 * - where the person was when login opened, to come back to it;
 */
const web = Platform.OS === 'web' && typeof window !== 'undefined';
const FROM = 'rz.loginFrom';

function store(): Storage | null {
  try {
    return web ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Called just before opening the login screen. */
export function rememberLoginFrom() {
  if (!web || /\/login\/?$/.test(window.location.pathname)) return;
  store()?.setItem(FROM, window.location.pathname + window.location.search);
}

/** The page Google sends them back to: where they were, else the feed. */
export function loginReturnUrl(basePath: string): string {
  const from = store()?.getItem(FROM);
  const path = from && from.startsWith(basePath) ? from : `${basePath}/`;
  return window.location.origin + path;
}

/** Google sign-in is on for everyone on the website (25 Nov). The phone app still uses the email code. */
export const googleOn = (_isDemo?: boolean, _isAdmin?: boolean) => web;
