import { WEB_BASE } from './legal';

/**
 * Invisible bot check (Cloudflare Turnstile) for creating a guest account and for email login.
 * The widget runs in public/captcha.html (WebView on Android, iframe on web) and is usually invisible;
 * it only shows a checkbox when Cloudflare thinks the device looks suspicious.
 * Without a site key this is a no-op, so the app keeps working before the check is switched on.
 */
const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY || '';
export const captchaOn = SITE_KEY.length > 0;
export const CAPTCHA_URL = `${WEB_BASE}/captcha.html?k=${encodeURIComponent(SITE_KEY)}`;
export const CAPTCHA_ORIGIN = new URL(WEB_BASE).origin;

type Waiter = { resolve: (t: string) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };
const waiters: Waiter[] = [];
let host: ((round: number) => void) | null = null;
let round = 0;

// Whether a person is waiting on the check (tapped vote, post, comment, login). Until then a tap
// request from Cloudflare stays out of the way, so reading is never interrupted.
let wanted = false;
const wantListeners = new Set<(w: boolean) => void>();
function setWanted(w: boolean) {
  if (wanted === w) return;
  wanted = w;
  wantListeners.forEach((f) => f(w));
}
export const wantCaptcha = () => setWanted(true);
export function subscribeWanted(fn: (w: boolean) => void) {
  wantListeners.add(fn);
  fn(wanted);
  return () => {
    wantListeners.delete(fn);
  };
}

/** Each token works once, so every caller gets a fresh widget run ("round"). 0 = nothing to do. */
function next() {
  if (!waiters.length) setWanted(false);
  host?.(waiters.length ? ++round : 0);
}

function settle(w: Waiter, token?: string, err?: Error) {
  const i = waiters.indexOf(w);
  if (i < 0) return;
  waiters.splice(i, 1);
  clearTimeout(w.timer);
  if (err) w.reject(err);
  else w.resolve(token!);
  next();
}

const fail = (w: Waiter, ms: number) => setTimeout(() => settle(w, undefined, new Error('CAPTCHA_FAILED: timeout')), ms);

/** A one-time token, or undefined when the check is switched off. Rejects after 30 s (2 min if a tap is asked). */
export function getCaptchaToken(): Promise<string | undefined> {
  if (!captchaOn) return Promise.resolve(undefined);
  return new Promise<string>((resolve, reject) => {
    const w = { resolve, reject } as Waiter;
    w.timer = fail(w, 30000);
    waiters.push(w);
    if (waiters.length === 1) next();
  });
}

/** Called by CaptchaHost. */
export function captchaSolved(token: string) {
  if (waiters[0]) settle(waiters[0], token);
}
/** Cloudflare wants a tap: give the person time. */
export function captchaInteractive() {
  const w = waiters[0];
  if (!w) return;
  clearTimeout(w.timer);
  w.timer = fail(w, 120000);
}
/** Script missing, or a setup error (Turnstile 110xxx: wrong site key or domain) — retrying won't help. */
export const isFatalCaptchaError = (code?: string) => code === 'script' || /^110\d{3}$/.test(code ?? '');
export function captchaBroken(code: string) {
  if (waiters[0]) settle(waiters[0], undefined, new Error(`CAPTCHA_FAILED: ${code}`));
}
export function subscribeCaptcha(fn: (round: number) => void) {
  host = fn;
  if (waiters.length) fn(++round);
  return () => {
    if (host === fn) host = null;
  };
}

/** Messages posted by public/captcha.html. */
export type CaptchaMsg = { source: 'rz-captcha'; type: 'token' | 'interactive' | 'error' | 'expired'; token?: string; code?: string };
export function parseCaptchaMsg(data: unknown): CaptchaMsg | null {
  try {
    const m = typeof data === 'string' ? JSON.parse(data) : data;
    return m && m.source === 'rz-captcha' ? (m as CaptchaMsg) : null;
  } catch {
    return null;
  }
}
