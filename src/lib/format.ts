import type { FeedItem, Verdict } from './types';

/** ₹ in Indian grouping: 134900 → ₹1,34,900 */
export function inr(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return '₹' + s;
  const head = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return '₹' + head + ',' + s.slice(-3);
}

export function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'abhi';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/** Time left to vote, or null if voting closed. */
export function timeLeft(iso: string): string | null {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3.6e6);
  return h >= 1 ? `${h}h baaki` : `${Math.max(1, Math.floor(ms / 6e4))}m baaki`;
}

export function verdictText(r: FeedItem): string {
  if (r.approve_count === r.reject_count) return r.approve_count ? 'Tie — tum decide karo' : 'Kisi ne vote nahi kiya';
  return r.approve_count > r.reject_count ? 'Janta: Le le ✅' : 'Janta: Rehne de ❌';
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
