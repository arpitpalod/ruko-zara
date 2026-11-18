import type { T } from './i18n';
import type { FeedItem, Verdict } from './types';

/** ₹ in Indian grouping: 134900 → ₹1,34,900 */
export function inr(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return '₹' + s;
  const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '₹' + head + ',' + s.slice(-3);
}

export function ago(iso: string, t: T): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return t('time.now');
  if (m < 60) return t('time.m', { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.h', { n: h });
  return t('time.d', { n: Math.floor(h / 24) });
}

/** Time left to vote, or null if voting closed. */
export function timeLeft(iso: string, t: T): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3.6e6);
  if (h >= 48) return t('time.leftD', { n: Math.floor(h / 24) });
  return h >= 1 ? t('time.leftH', { n: h }) : t('time.leftM', { n: Math.max(1, Math.floor(ms / 6e4)) });
}

export function verdictText(r: FeedItem, t: T): string {
  if (r.approve_count === r.reject_count) return r.approve_count ? t('verdict.tie') : t('verdict.none');
  return r.approve_count > r.reject_count ? t('verdict.yes') : t('verdict.no');
}

/** "https://www.amazon.in/dp/…" → "amazon.in" */
export function domainOf(url: string): string {
  const m = url.match(/^https?:\/\/([^/:?#]+)/i);
  return (m ? m[1] : url).replace(/^www\./i, '').toLowerCase();
}

/** Pulls the first web link out of pasted text (shopping apps share "Check this out… https://…"). */
export function extractLink(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s]+/i);
  if (m) return m[0];
  const bare = text.trim();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(bare) ? `https://${bare}` : null;
}

/** Category codes are stored in the database; this shows them in the chosen language. */
export function catLabel(code: string, t: T): string {
  const key = `cat.${code}` as Parameters<T>[0];
  const label = t(key);
  return label || code;
}

/** Optimistic local update when the user votes or changes their vote. */
export function applyVote(r: FeedItem, v: Verdict): FeedItem {
  if (r.my_vote === v) return r;
  const out = { ...r, my_vote: v };
  if (r.my_vote === 'approve') out.approve_count--;
  if (r.my_vote === 'reject') out.reject_count--;
  if (v === 'approve') out.approve_count++;
  else out.reject_count++;
  return out;
}

