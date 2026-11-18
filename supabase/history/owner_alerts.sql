-- Owner alerts: when the hourly live check or the nightly backup fails, GitHub Actions adds a row here
-- (it already has database access). The insert wakes the send-alert function, which picks up unsent
-- alerts with the server key and emails them through the app's existing Gmail sender.
-- The recipient is a Vault secret ('alert_email'), not in this public repo.
create table if not exists private.alerts (
  id         bigint generated always as identity primary key,
  subject    text not null check (char_length(subject) <= 200),
  body       text not null check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
revoke all on private.alerts from public, anon, authenticated;

-- Server-only: unsent alerts plus the recipient; and marking them sent.
create or replace function public.alerts_take()
returns table (id bigint, subject text, body text, recipient text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.subject, a.body,
         (select s.decrypted_secret from vault.decrypted_secrets s where s.name = 'alert_email')
  from private.alerts a where a.sent_at is null order by a.id limit 10
$$;
revoke all on function public.alerts_take() from public, anon, authenticated;
grant execute on function public.alerts_take() to service_role;

create or replace function public.alerts_mark_sent(ids bigint[])
returns void language sql security definer set search_path = '' as $$
  update private.alerts set sent_at = now() where id = any(ids)
$$;
revoke all on function public.alerts_mark_sent(bigint[]) from public, anon, authenticated;
grant execute on function public.alerts_mark_sent(bigint[]) to service_role;

-- A new alert wakes the sender right away (same call pattern as the verdict-email job).
create or replace function private.wake_alert_sender() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_jwt')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  return null;
end $$;
revoke all on function private.wake_alert_sender() from public;

drop trigger if exists alerts_wake_sender on private.alerts;
create trigger alerts_wake_sender after insert on private.alerts
  for each statement execute function private.wake_alert_sender();
