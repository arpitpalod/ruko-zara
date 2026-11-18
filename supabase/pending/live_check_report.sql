-- Hourly live check run inside Supabase: pg_cron calls the Edge Function `live-check`, which checks
-- the app from the outside and reports here. GitHub never ran the scheduled workflow (18 Nov), so
-- this doesn't depend on it. An email goes out only when something changes: a new or different
-- problem, or everything fixed. (The cron job itself is set up on live only; see OPERATIONS.md.)

create table if not exists private.live_check_state (
  id boolean primary key default true check (id),  -- exactly one row
  failing text[] not null default '{}',
  since timestamptz,                                -- failing since
  last_run timestamptz
);
insert into private.live_check_state default values on conflict do nothing;
revoke all on private.live_check_state from public, anon, authenticated;

create or replace function public.live_check_report(problems text[])
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  prev text[];
  was_failing boolean;
  is_failing boolean := coalesce(array_length(problems, 1), 0) > 0;
begin
  select s.failing into prev from private.live_check_state s where s.id for update;
  was_failing := coalesce(array_length(prev, 1), 0) > 0;

  if is_failing and prev is distinct from problems then
    insert into private.alerts (subject, body) values (
      '🚨 Live check failed',
      E'The hourly check (run from Supabase) found:\n- ' || array_to_string(problems, E'\n- ') ||
      E'\n\nYou''ll get another email when it''s fixed. Details: Supabase → Edge Functions → live-check → Logs.');
    update private.live_check_state s
      set failing = problems, since = case when was_failing then s.since else now() end, last_run = now()
      where s.id;
    return 'alerted';
  elsif not is_failing and was_failing then
    insert into private.alerts (subject, body) values (
      '✅ Resolved: live check passes again',
      E'All hourly checks pass again.\nThe problems were:\n- ' || array_to_string(prev, E'\n- '));
    update private.live_check_state s set failing = '{}', since = null, last_run = now() where s.id;
    return 'resolved';
  end if;

  update private.live_check_state s set last_run = now() where s.id;
  return case when is_failing then 'still failing' else 'ok' end;
end $$;

revoke all on function public.live_check_report(text[]) from public, anon, authenticated;
grant execute on function public.live_check_report(text[]) to service_role;
