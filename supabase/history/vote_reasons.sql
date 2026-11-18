-- Vote reasons (18 Nov): every vote carries one reason, picked from a fixed list.
-- Buy it:  need_it · worth_price · treat_yourself
-- Skip it: dont_need · wait_sale · cheaper_option · too_much
-- The app asks for a reason on every vote, but the database allows none so that older app
-- versions (Android installs that haven't updated yet) keep voting as before.

alter table public.votes add column if not exists reason text;

alter table public.votes drop constraint if exists votes_reason_check;
alter table public.votes add constraint votes_reason_check check (
  reason is null
  or (verdict = 'approve' and reason in ('need_it', 'worth_price', 'treat_yourself'))
  or (verdict = 'reject' and reason in ('dont_need', 'wait_sale', 'cheaper_option', 'too_much'))
);

grant select (reason), insert (reason), update (reason) on public.votes to authenticated;

-- An older app changes a vote without sending a reason: the old reason belongs to the other side,
-- so drop it instead of refusing the change.
create or replace function public.vote_reason_reset()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if new.verdict is distinct from old.verdict and new.reason is not distinct from old.reason then
    new.reason := null;
  end if;
  return new;
end $$;

drop trigger if exists votes_reason_reset on public.votes;
create trigger votes_reason_reset before update on public.votes
  for each row execute function public.vote_reason_reset();

-- How many voters gave each reason on one arzi.
-- Same rules as the vote split: only for people who may see the arzi (as the requests read policy),
-- and only once they have voted, own it, are an admin, or voting has closed.
-- Banned voters' reasons reach nobody but themselves.
create or replace function public.vote_reasons(target uuid)
returns table (reason text, n integer)
language sql
stable
security definer
set search_path to ''
as $$
  with me as (select auth.uid() as uid, public.is_admin() as admin)
  select v.reason, count(*)::integer
  from public.requests r
  cross join me
  join public.votes v on v.request_id = r.id
  where r.id = target
    and (r.user_id = me.uid or me.admin or (not r.hidden and not private.is_banned(r.user_id)))
    and not exists (select 1 from public.blocks b where b.blocker_id = me.uid and b.blocked_id = r.user_id)
    and (r.user_id = me.uid or me.admin or r.closes_at <= now()
         or exists (select 1 from public.votes mine where mine.request_id = r.id and mine.user_id = me.uid))
    and v.reason is not null
    and (not private.is_banned(v.user_id) or v.user_id = me.uid)
  group by v.reason
$$;

revoke execute on function public.vote_reasons(uuid) from public, anon;
grant execute on function public.vote_reasons(uuid) to authenticated;
