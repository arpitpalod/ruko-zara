import type { FeedItem, Verdict } from './types';

/** The winning side and its share of real votes. A tie counts as Buy it. */
export function verdictOf(r: Pick<FeedItem, 'approve_count' | 'reject_count'>): { side: Verdict; pct: number; total: number } {
  const yes = Number(r.approve_count) || 0;
  const no = Number(r.reject_count) || 0;
  const total = yes + no;
  if (!total) return { side: 'approve', pct: 0, total: 0 };
  const side: Verdict = yes >= no ? 'approve' : 'reject';
  return { side, pct: Math.round((100 * (side === 'approve' ? yes : no)) / total), total };
}

/** A poster can share their result once voting has closed, or once 10 people have voted. */
export const canShareResult = (r: Pick<FeedItem, 'approve_count' | 'reject_count' | 'closes_at'>, now = Date.now()) => {
  const { total } = verdictOf(r);
  return total > 0 && (total >= 10 || new Date(r.closes_at).getTime() <= now);
};
