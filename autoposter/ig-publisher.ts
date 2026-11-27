// ig-publisher: posts queued Reels to @rukozara.app through the Instagram API.
// Called by pg_cron every 10 minutes (header x-cron-secret must match Vault 'ig_cron_secret').
// Actions (JSON body):
//   {"action":"run"}                          work through public.ig_queue (default)
//   {"action":"check"}                        token/account diagnostics, posts nothing
//   {"action":"test_container","video_url":…} upload a video as an unpublished container, never publishes
// The token comes from Vault ('instagram_token') via public.ig_secret(); it is never logged or returned.
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function adminKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys.default) return keys.default;
  } catch { /* legacy key below */ }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

type Settings = { enabled: boolean; ig_user_id: string; graph_host: string };

class Graph {
  constructor(private host: string, private token: string) {}
  version = '';
  private async call(method: 'GET' | 'POST', path: string, params: Record<string, string> = {}) {
    const url = new URL(`https://${this.host}/${path}`);
    const init: RequestInit = { method, headers: { Authorization: `Bearer ${this.token}` } };
    if (method === 'GET') for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    else init.body = new URLSearchParams(params);
    const res = await fetch(url, init);
    this.version = res.headers.get('facebook-api-version') ?? this.version;
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
      const e = body.error ?? {};
      throw new Error(`${method} ${path.split('?')[0]} → ${res.status} ${e.type ?? ''} ${e.code ?? ''}: ${e.error_user_msg ?? e.message ?? 'unknown error'}`.slice(0, 400));
    }
    return body;
  }
  get = (p: string, q: Record<string, string> = {}) => this.call('GET', p, q);
  post = (p: string, q: Record<string, string> = {}) => this.call('POST', p, q);

  // Create a Reels container and push the video bytes to Meta (resumable upload).
  async uploadReel(igUser: string, videoUrl: string, caption: string, thumbOffsetMs?: number | null) {
    const vid = await fetch(videoUrl);
    if (!vid.ok) throw new Error(`video fetch ${vid.status} for ${videoUrl}`);
    const bytes = new Uint8Array(await vid.arrayBuffer());
    if (bytes.length < 10_000) throw new Error(`video too small (${bytes.length} bytes)`);
    const params: Record<string, string> = {
      media_type: 'REELS', upload_type: 'resumable', caption, share_to_feed: 'true',
    };
    if (thumbOffsetMs != null) params.thumb_offset = String(thumbOffsetMs);
    const c = await this.post(`${igUser}/media`, params);
    const uri: string = c.uri ?? `https://rupload.facebook.com/ig-api-upload/${this.version || 'v21.0'}/${c.id}`;
    const up = await fetch(uri, {
      method: 'POST',
      headers: { Authorization: `OAuth ${this.token}`, offset: '0', file_size: String(bytes.length) },
      body: bytes,
    });
    const upBody = await up.json().catch(() => ({}));
    if (!up.ok || upBody.error || upBody.success === false) {
      throw new Error(`upload → ${up.status}: ${JSON.stringify(upBody.error ?? upBody).slice(0, 300)}`);
    }
    return { containerId: String(c.id), bytes: bytes.length };
  }
}

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, adminKey(), { auth: { persistSession: false } });
  const secret = async (name: string) => {
    const { data, error } = await sb.rpc('ig_secret', { p_name: name });
    if (error) throw new Error(`secret ${name}: ${error.message}`);
    return data as string | null;
  };

  try {
    const cronSecret = await secret('ig_cron_secret');
    if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) return json({ error: 'forbidden' }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? 'run';
    const { data: s, error: sErr } = await sb.from('ig_settings').select('*').single();
    if (sErr) throw new Error(`settings: ${sErr.message}`);
    const settings = s as Settings;
    const token = await secret('instagram_token');
    if (!token) return json({ error: 'instagram_token is not in Vault' }, 500);

    // ---------- diagnostics ----------
    if (action === 'check') {
      const out: Record<string, unknown> = {};
      for (const host of ['graph.facebook.com', 'graph.instagram.com']) {
        const g = new Graph(host, token);
        const r: Record<string, unknown> = {};
        try { r.account = await g.get(settings.ig_user_id, { fields: 'id,username,media_count,followers_count' }); }
        catch (e) { r.account_error = String(e); }
        try { r.limit = await g.get(`${settings.ig_user_id}/content_publishing_limit`, { fields: 'quota_usage,config' }); }
        catch (e) { r.limit_error = String(e); }
        r.api_version = g.version;
        out[host] = r;
      }
      return json(out);
    }

    const g = new Graph(settings.graph_host, token);

    if (action === 'test_container') {
      if (!body.video_url) return json({ error: 'video_url required' }, 400);
      const { containerId, bytes } = await g.uploadReel(settings.ig_user_id, body.video_url, '(test, not published)');
      let status = '';
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 6000));
        const st = await g.get(containerId, { fields: 'status_code,status' });
        status = `${st.status_code} ${st.status ?? ''}`.trim();
        if (st.status_code !== 'IN_PROGRESS') break;
      }
      return json({ containerId, bytes, status, api_version: g.version, published: false });
    }

    // ---------- run ----------
    if (!settings.enabled) return json({ skipped: 'posting is paused (ig_settings.enabled = false)' });
    const log: string[] = [];
    const now = new Date().toISOString();
    const upd = (id: number, patch: Record<string, unknown>) =>
      sb.from('ig_queue').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);

    // 1. Finish anything already uploaded.
    const { data: uploaded } = await sb.from('ig_queue').select('*').eq('status', 'uploaded').limit(5);
    for (const row of uploaded ?? []) {
      try {
        const st = await g.get(row.container_id, { fields: 'status_code,status' });
        if (st.status_code === 'FINISHED') {
          const pub = await g.post(`${settings.ig_user_id}/media_publish`, { creation_id: row.container_id });
          let permalink: string | null = null;
          try { permalink = (await g.get(pub.id, { fields: 'permalink' })).permalink ?? null; } catch { /* optional */ }
          await upd(row.id, { status: 'published', media_id: String(pub.id), permalink, published_at: new Date().toISOString(), last_error: null });
          log.push(`#${row.id} published ${permalink ?? pub.id}`);
        } else if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') {
          await upd(row.id, { status: 'failed', last_error: `${st.status_code}: ${st.status ?? ''}`.slice(0, 400) });
          log.push(`#${row.id} container ${st.status_code}`);
        } else if (Date.now() - new Date(row.updated_at).getTime() > 2 * 3600e3) {
          await upd(row.id, { status: 'failed', last_error: `stuck in ${st.status_code} for 2h` });
          log.push(`#${row.id} stuck`);
        } else log.push(`#${row.id} still ${st.status_code}`);
      } catch (e) {
        await upd(row.id, { last_error: String(e).slice(0, 400) });
        log.push(`#${row.id} check error: ${String(e).slice(0, 200)}`);
      }
    }

    // 2. Start the next due post (one per run).
    const { data: due } = await sb.from('ig_queue').select('*').eq('status', 'queued').lte('scheduled_at', now)
      .order('scheduled_at').limit(1);
    for (const row of due ?? []) {
      // Safety: featured requests must still be public and opted in; vote splits only after voting closed.
      if (row.request_id) {
        const { data: r } = await sb.from('requests').select('feature_ok, hidden, closes_at').eq('id', row.request_id).single();
        const closed = r && new Date(r.closes_at).getTime() <= Date.now();
        const why = !r ? 'request deleted' : !r.feature_ok ? 'poster no longer OK to feature' : r.hidden ? 'request hidden'
          : row.shows_result && !closed ? 'shows a vote split but voting is still open' : '';
        if (why) {
          await upd(row.id, { status: 'skipped', last_error: why });
          log.push(`#${row.id} skipped: ${why}`);
          continue;
        }
      }
      try {
        const { containerId } = await g.uploadReel(settings.ig_user_id, row.video_url, row.caption, row.thumb_offset_ms);
        await upd(row.id, { status: 'uploaded', container_id: containerId, attempts: row.attempts + 1, last_error: null });
        log.push(`#${row.id} uploaded, container ${containerId}`);
      } catch (e) {
        const attempts = row.attempts + 1;
        await upd(row.id, { attempts, status: attempts >= 3 ? 'failed' : 'queued', last_error: String(e).slice(0, 400) });
        log.push(`#${row.id} upload error (try ${attempts}): ${String(e).slice(0, 200)}`);
      }
    }

    console.log(JSON.stringify(log));
    return json({ log });
  } catch (e) {
    console.error(String(e));
    return json({ error: String(e).slice(0, 400) }, 500);
  }
});
