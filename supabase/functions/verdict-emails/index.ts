// "Verdict is in" emails. Runs every 15 minutes (pg_cron → pg_net).
// For requests whose 24 hours ended in the last 3 days and that haven't been emailed yet,
// sends the poster a bilingual (English + Hindi) email with the result, then marks the request.
// Needs two Edge Function secrets: GMAIL_USER and GMAIL_APP_PASSWORD.
import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'npm:@supabase/supabase-js@2';

const WEB = 'https://arpitpalod.github.io/ruko-zara';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function inr(n: number): string {
  const s = Math.round(n).toString();
  if (s.length <= 3) return '₹' + s;
  return '₹' + s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + s.slice(-3);
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function adminKey(): string {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}');
    if (keys.default) return keys.default;
  } catch {
    // fall through to the legacy key
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

Deno.serve(async () => {
  const user = Deno.env.get('GMAIL_USER');
  const pass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !pass) return json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD secrets are not set' }, 500);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, adminKey(), { auth: { persistSession: false } });
  const now = new Date();
  const since = new Date(now.getTime() - 3 * 864e5);

  const { data: due, error } = await sb
    .from('requests')
    .select('id, user_id, item, price_inr, vote_yes, vote_no')
    .lte('closes_at', now.toISOString())
    .gte('closes_at', since.toISOString())
    .is('verdict_emailed_at', null)
    .eq('hidden', false)
    .limit(25);
  if (error) return json({ error: error.message }, 500);

  const mail = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
  let sent = 0;
  let noEmail = 0;
  const errors: string[] = [];

  for (const r of due ?? []) {
    const { data: u, error: userErr } = await sb.auth.admin.getUserById(r.user_id);
    if (userErr) {
      errors.push(`user lookup: ${userErr.message}`);
      continue; // not marked: retried on the next run
    }
    const email = u?.user?.email;

    if (email) {
      // Same totals everyone sees in the app (banned people's votes are left out).
      const yes = r.vote_yes ?? 0;
      const no = r.vote_no ?? 0;
      const verdict =
        yes === no
          ? yes
            ? { en: "It's a tie — your call", hi: 'बराबरी — फ़ैसला आपका' }
            : { en: 'Nobody voted this time', hi: 'इस बार किसी ने वोट नहीं किया' }
          : yes > no
            ? { en: 'Buy it ✅', hi: 'ले लो ✅' }
            : { en: 'Skip it ❌', hi: 'रहने दो ❌' };
      const link = `${WEB}/request/${r.id}`;

      try {
        await mail.sendMail({
          from: `"Ruko Zara" <${user}>`,
          to: email,
          subject: `Faisla aa gaya / Verdict is in: ${r.item}`,
          html: `
            <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;color:#1C1917">
              <h2 style="margin:0 0 12px">Ruko Zara ✋</h2>
              <p style="font-size:17px;margin:0"><b>${esc(r.item)}</b> · ${inr(r.price_inr)}</p>
              <p style="font-size:22px;margin:14px 0 4px"><b>${verdict.hi}</b></p>
              <p style="font-size:16px;margin:0 0 12px;color:#78716C">The crowd says: <b>${verdict.en}</b></p>
              <p style="margin:0 0 18px">👍 ${yes} &nbsp;·&nbsp; 👎 ${no}</p>
              <p style="font-size:16px;line-height:1.6;margin:0">
                👉 <a href="${link}" style="color:#E8590C;font-weight:700">देखें और बताएँ आपने क्या किया</a><br>
                👉 <a href="${link}" style="color:#E8590C;font-weight:700">See it and tell us what you did</a></p>
              <p style="font-size:12px;color:#78716C;margin-top:24px">You got this because you posted on Ruko Zara.
                <a href="${WEB}/privacy.html">Privacy</a></p>
            </div>`,
        });
        sent++;
        console.log(`sent verdict email for ${r.id}`);
      } catch (e) {
        console.error(`send failed for ${r.id}: ${String(e).slice(0, 300)}`);
        errors.push(String(e).slice(0, 200));
        continue; // not marked: retried on the next run
      }
    } else {
      noEmail++;
    }

    await sb.from('requests').update({ verdict_emailed_at: now.toISOString() }).eq('id', r.id);
  }

  const result = { due: (due ?? []).length, sent, noEmail, errors };
  console.log(JSON.stringify(result));
  return json(result);
});
