// Link preview for the New arzi form: the product's title and photo from a shop's page, like WhatsApp shows.
// Safety: only shops on the allowed list (allowed_link_domains), https only; redirects are followed only to
// allowed shops (short links like amzn.in); 5-second and 1.5 MB limits; signed-in callers only (guests count,
// the anon key alone doesn't); a per-person limit. Nothing is stored in this mode. It also tells the form when a shop
// isn't allowed, so people learn that before pressing Send, not after.
//
// Photo mode ({ photo_for: <arzi id> }): called by the database right after an arzi with a shop link is
// saved (trigger requests_photo), and once for older arzi. It takes only the arzi's id: the link is read
// from the database, never from the caller, so nobody can put their own picture on the feed. The photo is
// copied to our own storage (bucket "photos", <arzi id>.jpg/png/webp, a small ~400 px copy where the shop
// offers one), so visitors' phones never load it from the shop. requests.photo is filled once, only while
// empty. Anyone may call it (the database uses the anon key); the worst they can do is make us look up the
// right photo again, and each arzi is tried at most every 10 minutes.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedHost, fetchPage, fetchPhoto, pick, smallerPhoto, titleFromLink } from './preview.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function adminKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys.default) return keys.default;
  } catch {
    // fall through to the legacy key
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}
const sb = createClient(Deno.env.get('SUPABASE_URL')!, adminKey(), { auth: { persistSession: false } });

let domains: string[] = [];
let domainsAt = 0;
async function allowedDomains(): Promise<string[]> {
  if (domains.length && Date.now() - domainsAt < 10 * 60_000) return domains;
  const { data, error } = await sb.from('allowed_link_domains').select('domain');
  if (error) throw error;
  domains = (data ?? []).map((d) => String(d.domain).toLowerCase());
  domainsAt = Date.now();
  return domains;
}

const recent = new Map<string, number[]>(); // per person, this server copy: at most 15 a minute
function tooMany(who: string): boolean {
  const now = Date.now();
  const times = (recent.get(who) ?? []).filter((t) => now - t < 60_000);
  if (times.length >= 15) return true;
  times.push(now);
  recent.set(who, times);
  return false;
}

const tried = new Map<string, number>(); // per arzi, this server copy: one try every 10 minutes
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function fillPhoto(id: string): Promise<Response> {
  if (!UUID.test(id)) return json({ error: 'bad id' }, 400);
  const now = Date.now();
  if (now - (tried.get(id) ?? 0) < 10 * 60_000) return json({ skipped: 'tried recently' });
  if (tried.size > 5000) tried.clear();
  tried.set(id, now);
  const { data, error } = await sb.from('requests').select('link, photo').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data?.link || data.photo) return json({ skipped: 'nothing to do' });
  let url: URL;
  try {
    url = new URL(data.link);
  } catch {
    return json({ skipped: 'bad link' });
  }
  if (url.protocol === 'http:') url.protocol = 'https:';
  const list = await allowedDomains();
  if (url.protocol !== 'https:' || !allowedHost(url.hostname.toLowerCase(), list)) return json({ skipped: 'shop not allowed' });
  const page = await fetchPage(url, list).catch(() => null);
  const found = page ? pick(page.html, page.url).image : null;
  if (!found) return json({ photo: null, why: 'no photo on the page' });
  const small = smallerPhoto(found);
  const got = (await fetchPhoto(small).catch(() => null)) ?? (small !== found ? await fetchPhoto(found).catch(() => null) : null);
  if (!got) return json({ photo: null, why: 'photo could not be downloaded' });
  const photo = `${id}.${got.ext}`;
  const { error: upError } = await sb.storage
    .from('photos')
    .upload(photo, got.bytes, { contentType: got.type, upsert: true, cacheControl: '31536000' });
  if (upError) throw upError;
  const { error: saveError } = await sb.from('requests').update({ photo }).eq('id', id).is('photo', null);
  if (saveError) throw saveError;
  return json({ photo, bytes: got.bytes.length });
}

/** The signed-in person from the (already verified) token; null for the bare anon key. */
function caller(req: Request): string | null {
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.sub === 'string' && payload.role === 'authenticated' ? payload.sub : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const body = await req.json().catch(() => null);
  if (body && typeof body.photo_for === 'string') {
    try {
      return await fillPhoto(body.photo_for);
    } catch (e) {
      return json({ error: (e as Error).message }, 500);
    }
  }
  const who = caller(req);
  if (!who) return json({ error: 'sign in first' }, 401);
  if (tooMany(who)) return json({ error: 'too many' }, 429);
  let url: URL;
  try {
    url = new URL(String(body?.url ?? '').trim());
  } catch {
    return json({ error: 'bad url' }, 400);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return json({ error: 'bad url' }, 400);
  if (url.protocol === 'http:') url.protocol = 'https:';
  const site = url.hostname.toLowerCase().replace(/^www\./, '');
  try {
    const list = await allowedDomains();
    if (!allowedHost(url.hostname.toLowerCase(), list)) return json({ allowed: false, site });
    const page = await fetchPage(url, list).catch(() => null);
    const found = page ? pick(page.html, page.url) : { title: null, image: null };
    return json({ allowed: true, site, title: found.title ?? titleFromLink(page?.url ?? url), image: found.image });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
