/// <reference types="jest" />
import { friendly, isGuestLimit } from '../errors';
import { applyVote, domainOf, extractLink, inr, timeLeft, verdictText } from '../format';
import type { T } from '../i18n';
import { isNewer } from '../version';
import type { FeedItem } from '../types';

// Translation stub: returns the key plus any values, so tests read like the real text keys.
const t = ((key: string, vars?: Record<string, string | number>) =>
  vars ? `${key}:${Object.values(vars).join(',')}` : key) as T;

const item = (over: Partial<FeedItem> = {}): FeedItem =>
  ({ id: 'r1', approve_count: 3, reject_count: 1, my_vote: null, ...over }) as FeedItem;

describe('money', () => {
  it.each([
    [0, '₹0'],
    [999, '₹999'],
    [1000, '₹1,000'],
    [134900, '₹1,34,900'],
    [10000000, '₹1,00,00,000'],
  ] as [number, string][])('inr(%p) = %p', (n, s) => expect(inr(n)).toBe(s));
});

describe('voting maths', () => {
  it('a first vote adds one', () => {
    expect(applyVote(item(), 'approve')).toMatchObject({ approve_count: 4, reject_count: 1, my_vote: 'approve' });
  });
  it('changing a vote moves it', () => {
    expect(applyVote(item({ my_vote: 'approve' }), 'reject')).toMatchObject({ approve_count: 2, reject_count: 2 });
  });
  it('voting the same way twice changes nothing', () => {
    const r = item({ my_vote: 'reject' });
    expect(applyVote(r, 'reject')).toBe(r);
  });
  it('verdict text', () => {
    expect(verdictText(item(), t)).toBe('verdict.yes');
    expect(verdictText(item({ approve_count: 0, reject_count: 2 }), t)).toBe('verdict.no');
    expect(verdictText(item({ approve_count: 2, reject_count: 2 }), t)).toBe('verdict.tie');
    expect(verdictText(item({ approve_count: 0, reject_count: 0 }), t)).toBe('verdict.none');
  });
});

describe('time left', () => {
  const inH = (h: number) => new Date(Date.now() + h * 3.6e6 + 60000).toISOString();
  it('closed', () => expect(timeLeft(new Date(Date.now() - 1000).toISOString(), t)).toBeNull());
  it('hours', () => expect(timeLeft(inH(5), t)).toBe('time.leftH:5'));
  it('days from 48 hours', () => expect(timeLeft(inH(72), t)).toBe('time.leftD:3'));
});

describe('product links', () => {
  it('finds the link inside shared text', () => {
    expect(extractLink('Check this out! https://www.amazon.in/dp/B0X?ref=1 via app')).toBe('https://www.amazon.in/dp/B0X?ref=1');
  });
  it('adds https to a bare domain', () => expect(extractLink('flipkart.com/p/123')).toBe('https://flipkart.com/p/123'));
  it('ignores plain words', () => expect(extractLink('just some text')).toBeNull());
  it('shows a short shop name', () => expect(domainOf('https://www.Amazon.in/dp/1')).toBe('amazon.in'));
});

describe('friendly errors', () => {
  it.each([
    ['ABUSE_BLOCKED', 'error.abuse'],
    ['CONTACT_BLOCKED', 'error.contact'],
    ['LINK_NOT_ALLOWED', 'error.link'],
    ['Daily limit reached: 5 arzi per day', 'error.dailyLimit'],
    ['GUEST_VOTE_LIMIT', 'error.guestLimit'],
    ['captcha protection: request disallowed (invalid-input-response)', 'error.captcha'],
    ['new row violates row-level security policy for table "requests"', 'error.loginNeeded'],
    ['Token has expired or is invalid', 'error.badCode'],
    ['TypeError: Failed to fetch', 'error.network'],
  ] as [string, string][])('%s → %s', (msg, key) => expect(friendly(new Error(msg), t)).toBe(key));
  it('unknown errors pass through', () => expect(friendly(new Error('Something odd'), t)).toBe('Something odd'));
  it('spots the guest vote limit', () => {
    expect(isGuestLimit(new Error('GUEST_VOTE_LIMIT'))).toBe(true);
    expect(isGuestLimit(new Error('other'))).toBe(false);
  });
});

describe('Android update check', () => {
  it('newer build → update', () => expect(isNewer(200, 100)).toBe(true));
  it('same build → no update', () => expect(isNewer(100, 100)).toBe(false));
  it('dev build (no number) → never nag', () => expect(isNewer(200, 0)).toBe(false));
  it('broken file → no update', () => expect(isNewer('200', 100)).toBe(false));
});
