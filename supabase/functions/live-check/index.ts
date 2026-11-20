// Checks the live app from the outside every hour, like a visitor (or an attacker) would, and
// reports to the database, which emails the owner only when something changes. Called by pg_cron
// (job "live-check-hourly"). Same checks as scripts/ci/live-check.sh, which GitHub runs after
// every release; this copy exists because GitHub never ran that script on its own schedule.
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEB = 'https://arpitpalod.github.io/ruko-zara';
const API = Deno.env.get('SUPABASE_URL')!;
const KEY = 'sb_publishable_zzkKt2NP7Ik8PDgaayC9jw_--3SFuTl'; // public by design (it's in the app)
const APK = 'https://github.com/arpitpalod/ruko-zara/releases/download/android-latest/app-release.apk';
const CLOSED = [401, 403, 404];

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

async function hit(url: string, init: RequestInit = {}): Promise<{ status: number; body: string }> {
  try {
    const r = await fetch(url, { redirect: 'manual', ...init, signal: AbortSignal.timeout(20_000) });
    return { status: r.status, body: init.method === 'HEAD' ? '' : await r.text() };
  } catch {
    return { status: 0, body: '' };
  }
}
const anon = { apikey: KEY };
const anonJson = { apikey: KEY, 'Content-Type': 'application/json' };

async function check(): Promise<string[]> {
  const bad: string[] = [];
  const t: Promise<void>[] = [];

  // 1. The app is up
  t.push(hit(`${WEB}/`).then((r) => { if (r.status !== 200 || !r.body.includes('_expo/static/js')) bad.push('Website is down or broken'); }));
  for (const p of ['captcha.html', 'privacy.html', 'terms.html'])
    t.push(hit(`${WEB}/${p}`).then((r) => { if (r.status !== 200) bad.push(`${p} returned ${r.status}`); }));
  t.push(hit(APK, { method: 'HEAD' }).then((r) => { if (![200, 302].includes(r.status)) bad.push(`Android download returned ${r.status}`); }));

  // 2. Someone who isn't signed in can read nothing
  for (const tb of ['profiles', 'requests', 'votes', 'comments', 'reports', 'blocks', 'admins', 'blocked_words', 'allowed_link_domains', 'request_feed', 'banned_users'])
    t.push(hit(`${API}/rest/v1/${tb}?select=*&limit=1`, { headers: anon }).then((r) => {
      if (!CLOSED.includes(r.status)) bad.push(`OUTSIDER CAN READ ${tb} (HTTP ${r.status})`);
    }));
  for (const f of ['is_admin', 'guest_votes_left', 'delete_my_account', 'admin_set_hidden', 'admin_set_banned', 'admin_banned_ids', 'alerts_take', 'alerts_mark_sent', 'live_check_report', 'ig_work', 'ig_token'])
    t.push(hit(`${API}/rest/v1/rpc/${f}`, { method: 'POST', headers: anonJson, body: '{}' }).then((r) => {
      if (!CLOSED.includes(r.status)) bad.push(`OUTSIDER CAN CALL ${f} (HTTP ${r.status})`);
    }));

  // Called with a real argument: an empty body would miss the function and pass for the wrong reason.
  t.push(hit(`${API}/rest/v1/rpc/vote_reasons`, { method: 'POST', headers: anonJson, body: '{"target":"00000000-0000-0000-0000-000000000000"}' }).then((r) => {
    if (r.status !== 401 && r.status !== 403) bad.push(`OUTSIDER CAN READ VOTE REASONS (HTTP ${r.status})`);
  }));

  // 2b. The read-only preview shows only what it should
  t.push(hit(`${API}/rest/v1/rpc/public_feed`, { method: 'POST', headers: anonJson, body: '{"kind":"open"}' }).then((r) => {
    let rows: Record<string, unknown>[] = [];
    try { rows = JSON.parse(r.body); } catch { /* checked below */ }
    if (r.status !== 200 || !Array.isArray(rows) || rows.length === 0) bad.push('Preview of open arzi is broken');
    else if (rows.some((x) => 'user_id' in x || x.approve_count !== 0 || x.reject_count !== 0)) bad.push('PREVIEW LEAKS user ids or how people voted');
  }));

  // 3. Bots can't create accounts without passing the bot check
  t.push(hit(`${API}/auth/v1/signup`, { method: 'POST', headers: anonJson, body: '{}' }).then((r) => {
    if (!/captcha/i.test(r.body)) bad.push('BOT CHECK IS OFF: accounts can be created without it');
  }));

  // 4. The background jobs can't be triggered by strangers
  for (const fn of ['verdict-emails', 'send-alert'])
    t.push(hit(`${API}/functions/v1/${fn}`, { method: 'POST' }).then((r) => { if (r.status !== 401) bad.push(`${fn} job returned ${r.status}`); }));

  await Promise.all(t);
  return bad.sort();
}

Deno.serve(async () => {
  let problems = await check();
  if (problems.length) {
    // Ignore one-off network blips: only report what still fails 30 seconds later.
    await new Promise((r) => setTimeout(r, 30_000));
    problems = await check();
  }
  const sb = createClient(API, adminKey(), { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('live_check_report', { problems });
  if (error) return json({ error: error.message, problems }, 500);
  return json({ result: data, problems });
});
