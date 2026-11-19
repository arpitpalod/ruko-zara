/// <reference types="jest" />
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import { shouldShowPostNudge } from '../nudges';
import { summarize } from '../savings';
import type { FeedItem } from '../types';
import { canShareResult, verdictOf } from '../verdict';

const DAY = 864e5;
const now = Date.UTC(2026, 10, 20);

describe('"Now post yours"', () => {
  it('waits for the 5th vote', () => {
    expect(shouldShowPostNudge({ votes: 4, dismissedAt: null, posted: 0, lastPostedAt: null, now })).toBe(false);
    expect(shouldShowPostNudge({ votes: 5, dismissedAt: null, posted: 0, lastPostedAt: null, now })).toBe(true);
  });
  it('"Not now" hides it for 20 more votes', () => {
    expect(shouldShowPostNudge({ votes: 24, dismissedAt: 5, posted: 0, lastPostedAt: null, now })).toBe(false);
    expect(shouldShowPostNudge({ votes: 25, dismissedAt: 5, posted: 0, lastPostedAt: null, now })).toBe(true);
  });
  it('never shows to someone who posted in the last 7 days', () => {
    expect(shouldShowPostNudge({ votes: 50, dismissedAt: null, posted: 1, lastPostedAt: now - 6 * DAY, now })).toBe(false);
    expect(shouldShowPostNudge({ votes: 50, dismissedAt: null, posted: 1, lastPostedAt: now - 8 * DAY, now })).toBe(true);
  });
});

const item = (p: Partial<FeedItem>): FeedItem =>
  ({ id: 'x', user_id: 'me', item: 'Thing', price_inr: 1000, category: 'Other', reason: 'r', alternative: null,
     closes_at: new Date(now - DAY).toISOString(), outcome: null, created_at: new Date(now - 2 * DAY).toISOString(),
     handle: 'h', approve_count: 3, reject_count: 7, comment_count: 0, my_vote: null, link: null, hidden: false, ...p }) as FeedItem;

describe('your arzi, summed up', () => {
  it('counts savings only for "Didn\'t buy", and asks only about closed, unmarked arzi', () => {
    const m = summarize([
      item({ id: 'a', outcome: 'skipped', price_inr: 5000 }),
      item({ id: 'b', outcome: 'bought', price_inr: 9000 }),
      item({ id: 'c' }),
      item({ id: 'd', closes_at: new Date(now + DAY).toISOString() }),
    ], now);
    expect(m.saved).toBe(5000);
    expect(m.posted).toBe(4);
    expect(m.toDecide.map((x) => x.id)).toEqual(['c']);
  });
});

describe('result card', () => {
  it('shows the winning side and its share', () => {
    expect(verdictOf({ approve_count: 3, reject_count: 7 })).toEqual({ side: 'reject', pct: 70, total: 10 });
    expect(verdictOf({ approve_count: 5, reject_count: 5 }).side).toBe('approve');
    expect(verdictOf({ approve_count: 0, reject_count: 0 }).total).toBe(0);
  });
  it('can be shared once voting closes, or after 10 votes', () => {
    const open = new Date(now + DAY).toISOString();
    expect(canShareResult({ approve_count: 2, reject_count: 3, closes_at: open }, now)).toBe(false);
    expect(canShareResult({ approve_count: 4, reject_count: 6, closes_at: open }, now)).toBe(true);
    expect(canShareResult({ approve_count: 1, reject_count: 0, closes_at: new Date(now - 1).toISOString() }, now)).toBe(true);
    expect(canShareResult({ approve_count: 0, reject_count: 0, closes_at: new Date(now - 1).toISOString() }, now)).toBe(false);
  });
});
