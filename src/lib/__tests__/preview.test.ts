/// <reference types="jest" />
// A new phone reads the feed at once (preview, no account yet); anything that needs an account
// signs in first. Supabase is replaced by a small mockSb that records what was asked of it.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Result = { data: unknown; error: { message: string; code?: string } | null };
const log: string[] = [];
let session: { user: { id: string; email: string | null; is_anonymous: boolean } } | null = null;
let previewWorks = true;
let reasonColumn = true; // false: the live database hasn't got vote reasons yet

/** A query that accepts any chain of calls and resolves to `result`. */
function query(table: string, result: () => Result) {
  const q: any = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return (ok: (r: Result) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, bad);
        return (...args: unknown[]) => {
          if (prop === 'upsert' || prop === 'insert') log.push(`${String(prop)}:${table}:${JSON.stringify(args[0])}`);
          return q;
        };
      },
    },
  );
  return q;
}

const mockSb = {
  auth: {
    getSession: jest.fn(async () => ({ data: { session } })),
    signInAnonymously: jest.fn(async () => {
      log.push('signIn');
      session = { user: { id: 'guest-1', email: null, is_anonymous: true } };
      return { data: { session }, error: null };
    }),
  },
  rpc: jest.fn(async (name: string): Promise<Result> => {
    log.push(`rpc:${name}`);
    if (name === 'public_feed')
      return previewWorks
        ? { data: [{ id: 'r1', handle: 'Kanjoos Kabootar 1', approve_count: 0, reject_count: 0, vote_total: 5, preview: true }], error: null }
        : { data: null, error: { message: 'Could not find the function', code: 'PGRST202' } };
    if (name === 'is_admin') return { data: false, error: null };
    return { data: null, error: null };
  }),
  from: jest.fn((table: string) => {
    log.push(`from:${table}`);
    if (table === 'profiles') return query(table, () => ({ data: { handle: 'Sabar Panda 7' }, error: null }));
    if (table === 'request_feed')
      return query(table, () => ({ data: [{ id: 'r1', user_id: 'someone', approve_count: 3, reject_count: 2, my_vote: null }], error: null }));
    if (table === 'votes')
      return query(table, () =>
        !reasonColumn && log[log.length - 1].includes('"reason"')
          ? { data: null, error: { message: "Could not find the 'reason' column of 'votes' in the schema cache", code: 'PGRST204' } }
          : { data: null, error: null },
      );
    return query(table, () => ({ data: null, error: null }));
  }),
};
jest.mock('@supabase/supabase-js', () => ({ createClient: () => mockSb }));

import { createSupabaseApi } from '../supabaseApi';

beforeEach(() => {
  log.length = 0;
  session = null;
  previewWorks = true;
  reasonColumn = true;
  jest.clearAllMocks();
});

it('shows the feed before any sign-in, without user ids or vote splits', async () => {
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  const rows = await api.feed('open');
  expect(log).toEqual(['rpc:public_feed']);
  expect(rows[0]).toMatchObject({ id: 'r1', user_id: '', my_vote: null, preview: true, vote_total: 5 });
});

it('signs in before voting, then votes as that account', async () => {
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  await api.vote('r1', 'approve', 'need_it');
  expect(log[0]).toBe('signIn');
  expect(log).toContain('upsert:votes:{"request_id":"r1","user_id":"guest-1","verdict":"approve","reason":"need_it"}');
});

it('a vote still counts if the database has no reasons yet (reason dropped, not the vote)', async () => {
  reasonColumn = false;
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  await api.vote('r1', 'reject', 'wait_sale');
  expect(log).toContain('upsert:votes:{"request_id":"r1","user_id":"guest-1","verdict":"reject"}');
});

it('reasons are not asked for before sign-in (no tap request, no extra call)', async () => {
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  expect(await api.voteReasons('r1')).toEqual([]);
  expect(log).not.toContain('signIn');
  expect(log).not.toContain('rpc:vote_reasons');
});

it('the app start and a quick first vote share one sign-in', async () => {
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  const seen: string[] = [];
  api.onSignedIn((u) => seen.push(u.handle));
  await Promise.all([api.init(), api.vote('r1', 'reject')]);
  expect(mockSb.auth.signInAnonymously).toHaveBeenCalledTimes(1);
  expect(seen).toEqual(['Sabar Panda 7']);
});

it('reads the full feed once signed in', async () => {
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  await api.init();
  const rows = await api.feed('open');
  expect(log).not.toContain('rpc:public_feed');
  expect(rows[0]).toMatchObject({ user_id: 'someone', approve_count: 3 });
});

it('if the preview is unavailable, signs in and shows the full feed instead', async () => {
  previewWorks = false;
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  const rows = await api.feed('open');
  expect(log.slice(0, 2)).toEqual(['rpc:public_feed', 'signIn']);
  expect(rows[0]).toMatchObject({ user_id: 'someone' });
});

it('a failed sign-in is tried again by the next action', async () => {
  mockSb.auth.signInAnonymously.mockImplementationOnce(async () => ({ data: { session: null }, error: { message: 'captcha failed' } }) as any);
  const api = createSupabaseApi('https://x.supabase.co', 'key');
  await expect(api.init()).rejects.toThrow('captcha failed');
  await api.vote('r1', 'approve');
  expect(mockSb.auth.signInAnonymously).toHaveBeenCalledTimes(2);
});
