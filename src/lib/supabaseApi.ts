import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { getCaptchaToken, wantCaptcha } from './captcha';
import type { ReasonCount } from './reasons';
import type { Api, Comment, FeedItem, User } from './types';

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, {
    // Website: Google sign-in comes back with a one-time ?code= in the address, exchanged for the session here.
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: Platform.OS === 'web', flowType: 'pkce' },
  });

  // Refresh tokens only while the app is in the foreground (Supabase recommendation for RN).
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (s) =>
      s === 'active' ? sb.auth.startAutoRefresh() : sb.auth.stopAutoRefresh(),
    );
  }

  let uid = '';

  async function toUser(u: { id: string; email?: string | null }): Promise<User> {
    uid = u.id;
    const p = must<{ handle: string }>(await sb.from('profiles').select('handle').eq('id', uid).single());
    const admin = await sb.rpc('is_admin');
    return { id: uid, handle: p.handle, email: u.email || null, isAdmin: admin.data === true };
  }

  /**
   * Back from Google. A one-time ?code= in the address has just become the session: remove it, or a reload
   * would try it again and fail. With an error: if they didn't cancel, the Google account most likely
   * belongs to an existing Ruko Zara account (already linked, or same email), so sign in to that one,
   * as with an email that already has an account. Tried once only, so it can never loop.
   */
  async function afterGoogle(): Promise<boolean> {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const url = new URL(window.location.href);
    const q = new URLSearchParams(url.search + '&' + url.hash.slice(1));
    const error = q.get('error') ?? q.get('error_code');
    if (!error) return false;
    ['error', 'error_code', 'error_description', 'code', 'state', 'sb_flow_id'].forEach((k) => url.searchParams.delete(k));
    url.hash = '';
    window.history.replaceState(null, '', url.toString());
    const RETRY = 'rz.googleRetry';
    if (q.get('error') === 'access_denied' || window.sessionStorage.getItem(RETRY)) {
      window.sessionStorage.removeItem(RETRY);
      return false;
    }
    window.sessionStorage.setItem(RETRY, '1');
    await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: url.toString() } });
    return true; // leaving for Google again
  }

  function tidyCode() {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('code')) return;
    url.searchParams.delete('code');
    window.history.replaceState(null, '', url.toString());
    window.sessionStorage.removeItem('rz.googleRetry');
  }

  async function startSession(): Promise<User> {
    if (await afterGoogle()) return new Promise<User>(() => {}); // the page is about to change
    let session = (await sb.auth.getSession()).data.session; // (on the website this also takes in a Google ?code=)
    tidyCode();
    if (!session) {
      // Bot check; if it can't run, try anyway (the server decides whether a token is required).
      const captchaToken = await getCaptchaToken().catch(() => undefined);
      const r = await sb.auth.signInAnonymously({ options: { captchaToken } });
      if (r.error) throw new Error(r.error.message);
      session = r.data.session;
    }
    return toUser(session!.user);
  }

  // One sign-in at a time, shared by the app start and any action that needs an account.
  let signingIn: Promise<User> | null = null;
  const listeners = new Set<(u: User) => void>();
  function init(): Promise<User> {
    if (!signingIn) {
      signingIn = startSession().then(
        (u) => {
          listeners.forEach((f) => f(u));
          return u;
        },
        (e) => {
          signingIn = null; // let the next action try again
          throw e;
        },
      );
    }
    return signingIn;
  }
  /** Before anything that needs an account: from here on, a tap request from Cloudflare may be shown. */
  async function ensure() {
    wantCaptcha();
    await init();
  }
  const hasSession = async () => !!(await sb.auth.getSession()).data.session;
  /** Preview rows (not signed in yet) carry no user ids and no vote of yours. */
  const fromPreview = (r: any): FeedItem => ({ ...r, user_id: '', my_vote: null, hidden: false });

  return {
    init,

    onSignedIn(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    async sendEmailCode(email) {
      await ensure().catch(() => {}); // a guest sign-in still running must not replace this login later
      const session = (await sb.auth.getSession()).data.session;
      if (session?.user?.is_anonymous) {
        // Attach the email to this anonymous account so its requests and votes are kept.
        const r = await sb.auth.updateUser({ email });
        if (!r.error) return 'link';
        if (r.error.code !== 'email_exists') throw new Error(r.error.message);
      }
      // Email already has an account (e.g. new phone): log in to it instead.
      const captchaToken = await getCaptchaToken().catch(() => undefined);
      const r = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, captchaToken } });
      if (r.error) throw new Error(r.error.message);
      return 'login';
    },

    async verifyEmailCode(email, code, mode) {
      const r = await sb.auth.verifyOtp({ email, token: code, type: mode === 'link' ? 'email_change' : 'email' });
      if (r.error) throw new Error(r.error.message);
      const u = r.data.user ?? (await sb.auth.getUser()).data.user;
      if (!u) throw new Error('Verify nahi ho paya, dobara try karo');
      return toUser(u);
    },

    async signInWithGoogle(returnTo) {
      await ensure().catch(() => {}); // a guest sign-in still running must not replace this later
      const session = (await sb.auth.getSession()).data.session;
      const r = session?.user?.is_anonymous
        ? await sb.auth.linkIdentity({ provider: 'google', options: { redirectTo: returnTo } })
        : await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: returnTo } });
      if (r.error) throw new Error(r.error.message);
      return 'redirecting';
    },

    async adminSetBanned(userId, ban, reason) {
      await ensure();
      must(await sb.rpc('admin_set_banned', { target: userId, ban, reason: reason ?? null }));
    },

    async adminBannedIds() {
      await init();
      const r = await sb.rpc('admin_banned_ids');
      return r.error || !Array.isArray(r.data) ? [] : (r.data as string[]);
    },

    async adminSetHidden(type, id, hide) {
      await ensure();
      must(await sb.rpc('admin_set_hidden', { target_type: type, target_id: id, hide }));
    },

    async deleteAccount() {
      await ensure();
      must(await sb.rpc('delete_my_account'));
      await sb.auth.signOut({ scope: 'local' });
      signingIn = null;
      return init();
    },

    async feed(kind) {
      if (!(await hasSession())) {
        const p = await sb.rpc('public_feed', { kind });
        if (!p.error && Array.isArray(p.data)) return p.data.map(fromPreview);
        await ensure(); // preview unavailable: fall back to signing in first
      }
      const now = new Date().toISOString();
      const q = sb.from('request_feed').select('*');
      return must<FeedItem[]>(
        kind === 'open'
          ? await q.gt('closes_at', now).order('created_at', { ascending: false }).limit(100)
          : await q.lte('closes_at', now).order('closes_at', { ascending: false }).limit(50),
      );
    },

    async mine() {
      await ensure();
      return must<FeedItem[]>(
        await sb.from('request_feed').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      );
    },

    async get(id) {
      if (!(await hasSession())) {
        const p = await sb.rpc('public_request', { target: id });
        if (!p.error && Array.isArray(p.data)) return p.data[0] ? fromPreview(p.data[0]) : null;
        await ensure();
      }
      return must<FeedItem | null>(await sb.from('request_feed').select('*').eq('id', id).maybeSingle());
    },

    async comments(id) {
      if (!(await hasSession())) {
        const p = await sb.rpc('public_comments', { target: id });
        if (!p.error && Array.isArray(p.data)) return p.data.map((c: any): Comment => ({ ...c, user_id: '' }));
        await ensure();
      }
      const rows = must<any[]>(
        await sb
          .from('comments')
          .select('id, request_id, user_id, body, created_at, hidden, profiles(handle)')
          .eq('request_id', id)
          .order('created_at'),
      );
      return rows.map((r): Comment => ({ ...r, handle: r.profiles?.handle ?? '—' }));
    },

    async create(r) {
      await ensure();
      const { duration_hours, ...fields } = r;
      const closes_at = new Date(Date.now() + duration_hours * 3.6e6).toISOString(); // server caps at 7 days
      const d = must<{ id: string }>(
        await sb.from('requests').insert({ ...fields, closes_at, user_id: uid }).select('id').single(),
      );
      return d.id;
    },

    async vote(id, v, reason) {
      await ensure();
      const row = { request_id: id, user_id: uid, verdict: v };
      const res = await sb
        .from('votes')
        .upsert({ ...row, reason: reason ?? null }, { onConflict: 'request_id,user_id' });
      // Database not updated for reasons yet: the vote still counts, without its reason.
      if (res.error && /reason/i.test(res.error.message) && res.error.code === 'PGRST204') {
        must(await sb.from('votes').upsert(row, { onConflict: 'request_id,user_id' }));
        return;
      }
      must(res);
    },

    async voteReasons(id) {
      if (!(await hasSession())) return []; // preview: no split yet, so no reasons either
      const r = await sb.rpc('vote_reasons', { target: id });
      return r.error || !Array.isArray(r.data) ? [] : (r.data as ReasonCount[]);
    },

    async guestVotesLeft() {
      await init(); // automatic, not a tap: never brings up a tap request
      const r = await sb.rpc('guest_votes_left');
      return r.error || typeof r.data !== 'number' ? null : r.data;
    },

    async comment(id, body) {
      await ensure();
      must(await sb.from('comments').insert({ request_id: id, user_id: uid, body }));
    },

    async setOutcome(id, o) {
      await ensure();
      must(await sb.from('requests').update({ outcome: o }).eq('id', id));
    },

    async setFeatureOk(id, ok) {
      await ensure();
      must(await sb.from('requests').update({ feature_ok: ok }).eq('id', id));
    },

    async setSource(src) {
      if (!(await hasSession())) return;
      const r = await sb.rpc('set_source', { src });
      if (r.error) throw new Error(r.error.message); // kept on the phone and tried again next launch
    },

    async report(type, id, reason) {
      await ensure();
      const r = await sb.from('reports').insert({ target_type: type, target_id: id, user_id: uid, reason });
      if (r.error && r.error.code !== '23505') throw new Error(r.error.message); // 23505 = already reported
    },

    async block(userId) {
      await ensure();
      const r = await sb.from('blocks').insert({ blocker_id: uid, blocked_id: userId });
      if (r.error && r.error.code !== '23505') throw new Error(r.error.message); // already blocked
    },
  };
}
