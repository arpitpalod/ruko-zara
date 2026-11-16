import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import type { Api, Comment, FeedItem } from './types';

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

  return {
    async init() {
      let session = (await sb.auth.getSession()).data.session;
      if (!session) {
        const r = await sb.auth.signInAnonymously();
        if (r.error) throw new Error(r.error.message);
        session = r.data.session;
      }
      uid = session!.user.id;
      const p = must<{ handle: string }>(await sb.from('profiles').select('handle').eq('id', uid).single());
      return { id: uid, handle: p.handle };
    },

    async feed() {
      return must<FeedItem[]>(
        await sb.from('request_feed').select('*').order('created_at', { ascending: false }).limit(50),
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
          .select('id, request_id, user_id, body, created_at, profiles(handle)')
          .eq('request_id', id)
          .order('created_at'),
      );
      return rows.map((r): Comment => ({ ...r, handle: r.profiles?.handle ?? '—' }));
    },

    async create(r) {
      const d = must<{ id: string }>(
        await sb.from('requests').insert({ ...r, user_id: uid }).select('id').single(),
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
