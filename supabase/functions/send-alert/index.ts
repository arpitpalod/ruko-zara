// Emails pending owner alerts (live check / backup problems) from private.alerts.
// Woken by the database when an alert is added. Anyone calling it can only make it send what's
// already queued; alert content and the recipient come from the database (server key only).
import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

Deno.serve(async () => {
  const user = Deno.env.get('GMAIL_USER');
  const pass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !pass) return json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD secrets are not set' }, 500);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, adminKey(), { auth: { persistSession: false } });
  const { data: pending, error } = await sb.rpc('alerts_take');
  if (error) return json({ error: error.message }, 500);

  const mail = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
  const sent: number[] = [];
  const errors: string[] = [];
  for (const a of (pending ?? []) as { id: number; subject: string; body: string; recipient: string | null }[]) {
    if (!a.recipient) {
      errors.push('no alert_email in Vault');
      break;
    }
    try {
      await mail.sendMail({ from: `"Ruko Zara alerts" <${user}>`, to: a.recipient, subject: `[Ruko Zara] ${a.subject}`, text: a.body });
      sent.push(a.id);
    } catch (e) {
      errors.push(String(e).slice(0, 200)); // left unsent: retried next time
    }
  }
  if (sent.length) await sb.rpc('alerts_mark_sent', { ids: sent });

  const result = { pending: (pending ?? []).length, sent: sent.length, errors };
  console.log(JSON.stringify(result));
  return json(result);
});
