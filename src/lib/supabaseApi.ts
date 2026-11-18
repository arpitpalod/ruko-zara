import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { getCaptchaToken } from './captcha';
import type { Api, Comment, FeedItem, User } from './types';

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

export function createSupabaseApi(url: string, key: string): Api {
  const sb = createClient(url, key, {
    auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
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

  async function startSession(): Promise<User> {
    let session = (await sb.auth.getSession()).data.session;
    if (!session) {
      // Bot check; if it can't run, try anyway (the server decides whether a token is required).
      const captchaToken = await getCaptchaToken().catch(() => undefined);
      const r = await sb.auth.signInAnonymously({ options: { captchaToken } });
      if (r.error) throw new Error(r.error.message);
      session = r.data.session;
    }
    return toUser(session!.user);
  }

  return {
    init: startSession,

    async sendEmailCode(email) {
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

    async adminSetHidden(type, id, hide) {
      must(await sb.rpc('admin_set_hidden', { target_type: type, target_id: id, hide }));
    },

    async deleteAccount() {
      must(await sb.rpc('delete_my_account'));
      await sb.auth.signOut({ scope: 'local' });
      return startSession();
    },

    async feed(kind) {
      const now = new Date().toISOString();
      const q = sb.from('request_feed').select('*');
      return must<FeedItem[]>(
        kind === 'open'
          ? await q.gt('closes_at', now).order('created_at', { ascending: false }).limit(100)
          : await q.lte('closes_at', now).order('closes_at', { ascending: false }).limit(50),
      );
    },

    async mine() {
      return must<FeedItem[]>(
        await sb.from('request_feed').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      );
    },

    async get(id) {
      return must<FeedItem | null>(await sb.from('request_feed').select('*').eq('id', id).maybeSingle());
    },

    async comments(id) {
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
      const { duration_hours, ...fields } = r;
      const closes_at = new Date(Date.now() + duration_hours * 3.6e6).toISOString(); // server caps at 7 days
      const d = must<{ id: string }>(
        await sb.from('requests').insert({ ...fields, closes_at, user_id: uid }).select('id').single(),
      );
      return d.id;
    },

    async vote(id, v) {
      must(
        await sb
          .from('votes')
          .upsert({ request_id: id, user_id: uid, verdict: v }, { onConflict: 'request_id,user_id' }),
      );
    },

    async guestVotesLeft() {
      const r = await sb.rpc('guest_votes_left');
      return r.error || typeof r.data !== 'number' ? null : r.data;
    },

    async comment(id, body) {
      must(await sb.from('comments').insert({ request_id: id, user_id: uid, body }));
    },

    async setOutcome(id, o) {
      must(await sb.from('requests').update({ outcome: o }).eq('id', id));
    },

    async report(type, id, reason) {
      const r = await sb.from('reports').insert({ target_type: type, target_id: id, user_id: uid, reason });
      if (r.error && r.error.code !== '23505') throw new Error(r.error.message); // 23505 = already reported
    },

    async block(userId) {
      const r = await sb.from('blocks').insert({ blocker_id: uid, blocked_id: userId });
      if (r.error && r.error.code !== '23505') throw new Error(r.error.message); // already blocked
    },
  };
}
