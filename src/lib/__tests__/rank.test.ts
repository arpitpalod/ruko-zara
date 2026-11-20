import { byScore, trendScore } from '../rank';
import { langFromLink } from '../langFromLink';

const now = Date.parse('2026-11-21T12:00:00Z');
const r = (id: string, hoursAgo: number, votes: number) => ({
  id,
  created_at: new Date(now - hoursAgo * 3_600_000).toISOString(),
  approve_count: votes,
  reject_count: 0,
});

describe('trending order', () => {
  it('puts a brand-new arzi above an old one with a few votes', () => {
    expect(trendScore(r('new', 0, 0), now)).toBeGreaterThan(trendScore(r('old', 24, 20), now));
  });
  it('keeps a very popular arzi above a brand-new one', () => {
    expect(trendScore(r('hit', 24, 150), now)).toBeGreaterThan(trendScore(r('new', 0, 0), now));
  });
  it('lets an ignored arzi sink as it ages', () => {
    expect(trendScore(r('a', 1, 0), now)).toBeGreaterThan(trendScore(r('b', 10, 0), now));
  });
  it('sorts by score and keeps unscored items last', () => {
    const items = [r('a', 10, 0), r('b', 0, 0), r('c', 1, 0)];
    const score = new Map([['a', trendScore(items[0], now)], ['b', trendScore(items[1], now)]]);
    expect(byScore(items, score).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('language for a shared link', () => {
  it("uses the sharer's language", () => {
    expect(langFromLink('/ruko-zara/request/abc', '?src=wa&lang=hi', 'en-IN')).toBe('hi');
  });
  it('falls back to Hindi for a Hindi phone, else Hinglish', () => {
    expect(langFromLink('/ruko-zara/request/abc', '?src=wa', 'hi-IN')).toBe('hi');
    expect(langFromLink('/ruko-zara/request/abc', '', 'en-IN')).toBe('hinglish');
  });
  it('ignores anything else, and other pages still ask', () => {
    expect(langFromLink('/ruko-zara/request/abc', '?lang=fr', undefined)).toBe('hinglish');
    expect(langFromLink('/ruko-zara/', '?lang=hi', 'hi-IN')).toBeNull();
  });
});
