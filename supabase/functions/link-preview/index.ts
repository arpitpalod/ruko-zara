// Link preview for the New arzi form: the product's title and photo from a shop's page, like WhatsApp shows.
// Safety: only shops on the allowed list (allowed_link_domains), https only; redirects are followed only to
// allowed shops (short links like amzn.in); 5-second and 1.5 MB limits; signed-in callers only (guests count,
// the anon key alone doesn't); a per-person limit. Nothing is stored. It also tells the form when a shop
// isn't allowed, so people learn that before pressing Send, not after.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { allowedHost, fetchPage, pick, titleFromLink } from './preview.ts';

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
  const who = caller(req);
  if (!who) return json({ error: 'sign in first' }, 401);
  if (tooMany(who)) return json({ error: 'too many' }, 429);
  let url: URL;
  try {
    const body = await req.json();
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
