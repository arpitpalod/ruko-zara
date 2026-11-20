// Publishes approved posts from the Instagram queue (private.ig_posts) to @rukozara.app.
// Runs every 15 minutes (pg_cron → pg_net, with the anon JWT). Uses Instagram's official API
// (Instagram API with Instagram Login). The token lives in Vault as 'instagram_token' and is renewed
// here once a week, so it never reaches its 60-day expiry.
//
// A post goes queued → processing (Instagram is fetching/processing the media) → published.
// Videos can take minutes to process, so a post may finish on a later run. Errors count as attempts;
// after 3 the database marks it failed and emails the owner.
import { createClient } from 'npm:@supabase/supabase-js@2';

const IG = 'https://graph.instagram.com';
const RENEW_AFTER_DAYS = 7;

type Post = {
  id: string;
  kind: 'image' | 'carousel' | 'reel';
  media_urls: string[];
  cover_url: string | null;
  caption: string;
  status: 'queued' | 'processing';
  container_id: string | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function adminKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys.default) return keys.default;
  } catch {
    // fall through to the legacy key
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

class IgError extends Error {}

async function ig(token: string, path: string, params: Record<string, string> = {}, method: 'GET' | 'POST' = 'POST') {
  const url = new URL(`${IG}/${path}`);
  const init: RequestInit = { method, headers: { Authorization: `Bearer ${token}` } };
  if (method === 'GET') for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  else init.body = new URLSearchParams(params);
  const r = await fetch(url, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.error) throw new IgError(body.error?.message ?? `HTTP ${r.status}`);
  return body;
}

/** Creates Instagram's container for a post; returns its id. */
async function createContainer(token: string, p: Post): Promise<string> {
  if (p.kind === 'image') return (await ig(token, 'me/media', { image_url: p.media_urls[0], caption: p.caption })).id;
  if (p.kind === 'reel') {
    const params: Record<string, string> = { media_type: 'REELS', video_url: p.media_urls[0], caption: p.caption, share_to_feed: 'true' };
    if (p.cover_url) params.cover_url = p.cover_url;
    return (await ig(token, 'me/media', params)).id;
  }
  const children: string[] = [];
  for (const u of p.media_urls) {
    const item = u.endsWith('.mp4') ? { media_type: 'VIDEO', video_url: u } : { image_url: u };
    children.push((await ig(token, 'me/media', { ...item, is_carousel_item: 'true' })).id);
  }
  return (await ig(token, 'me/media', { media_type: 'CAROUSEL', children: children.join(','), caption: p.caption })).id;
}

/** FINISHED, IN_PROGRESS, ERROR or EXPIRED. */
async function containerStatus(token: string, id: string): Promise<string> {
  return (await ig(token, id, { fields: 'status_code' }, 'GET')).status_code;
}

Deno.serve(async () => {
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, adminKey(), { auth: { persistSession: false } });

  const { data: tok, error: tokErr } = await sb.rpc('ig_token');
  if (tokErr) return json({ error: `token lookup: ${tokErr.message}` }, 500);
  let token: string | undefined = tok?.[0]?.token;
  if (!token) return json({ skipped: 'no instagram_token in Vault yet' });

  // Renew the long-lived token weekly (each renewal is good for another 60 days).
  const savedAt = new Date(tok[0].saved_at).getTime();
  let renewed = false;
  if (Date.now() - savedAt > RENEW_AFTER_DAYS * 864e5) {
    try {
      const r = await ig(token, 'refresh_access_token', { grant_type: 'ig_refresh_token', access_token: token }, 'GET');
      if (r.access_token) {
        const { error } = await sb.rpc('ig_set_token', { p_token: r.access_token });
        if (!error) {
          token = r.access_token as string;
          renewed = true;
        }
      }
    } catch (e) {
      console.error(`token renewal failed: ${String(e).slice(0, 300)}`);
    }
  }

  const { data: work, error: workErr } = await sb.rpc('ig_work');
  if (workErr) return json({ error: `queue: ${workErr.message}` }, 500);

  const done: Record<string, string> = {};
  for (const p of (work ?? []) as Post[]) {
    const report = (status: string, extra: Record<string, string | null> = {}) =>
      sb.rpc('ig_update', { p_id: p.id, p_status: status, ...extra });
    try {
      let container = p.container_id;
      if (!container) {
        container = await createContainer(token!, p);
        await report('processing', { p_container_id: container });
      }
      // Wait up to ~40 s for Instagram to finish; videos that take longer finish on a later run.
      let status = await containerStatus(token!, container);
      for (let i = 0; i < 8 && status === 'IN_PROGRESS'; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        status = await containerStatus(token!, container);
      }
      if (status === 'IN_PROGRESS') {
        done[p.id] = 'still processing';
        continue;
      }
      if (status !== 'FINISHED') {
        // ERROR or EXPIRED: start over with a fresh container next time.
        await sb.rpc('ig_update', {
          p_id: p.id,
          p_status: 'queued',
          p_error: `Instagram could not process the media (${status})`,
          p_clear_container: true,
        });
        done[p.id] = `container ${status}`;
        continue;
      }
      const published = await ig(token!, 'me/media_publish', { creation_id: container });
      let permalink: string | null = null;
      try {
        permalink = (await ig(token!, published.id, { fields: 'permalink' }, 'GET')).permalink ?? null;
      } catch {
        // the post is up; the link is only nice to have
      }
      await report('published', { p_media_id: published.id, p_permalink: permalink });
      done[p.id] = 'published';
      console.log(`published ${p.id} → ${permalink ?? published.id}`);
    } catch (e) {
      const msg = String(e instanceof Error ? e.message : e).slice(0, 500);
      await sb.rpc('ig_update', { p_id: p.id, p_status: p.container_id ? 'processing' : 'queued', p_error: msg });
      done[p.id] = `error: ${msg}`;
      console.error(`post ${p.id}: ${msg}`);
    }
  }

  const result = { renewed, worked_on: Object.keys(done).length, done };
  console.log(JSON.stringify(result));
  return json(result);
});
