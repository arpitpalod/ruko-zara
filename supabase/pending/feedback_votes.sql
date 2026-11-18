-- Reddit feedback, 18 Nov.
-- 1. Vote speed limit: at most 10 NEW votes a minute per account (changing a vote is always fine).
--    Stops "pressed every Buy it in under a minute" and slows vote bots.
-- 2. Verified votes counted separately (accounts with a verified email), so results can show what
--    verified people said next to the total. Guests are cheap to fake; verified accounts aren't.

-- 1 ───────────────────────────────────────────────────────────────────────────
create index if not exists votes_user_created on public.votes (user_id, created_at);

create or replace function public.vote_speed_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('vote_speed:' || new.user_id::text, 0));
  if exists (select 1 from public.votes v where v.user_id = new.user_id and v.request_id = new.request_id) then
    return new; -- vote change (upsert), not a new vote
  end if;
  if (select count(*) from public.votes v
      where v.user_id = new.user_id and v.created_at > now() - interval '1 minute') >= 10 then
    raise exception 'VOTE_TOO_FAST' using hint = 'At most 10 new votes a minute';
  end if;
  return new;
end $$;
drop trigger if exists votes_speed_limit on public.votes;
create trigger votes_speed_limit before insert on public.votes
  for each row execute function public.vote_speed_limit();
revoke all on function public.vote_speed_limit() from public, anon, authenticated;

-- 2 ───────────────────────────────────────────────────────────────────────────
alter table public.requests
  add column if not exists verified_yes integer not null default 0,
  add column if not exists verified_no integer not null default 0;

-- One place that counts an arzi's votes: all, and verified only. Banned people never count.
create or replace function private.recount_votes(rid uuid) returns void
language sql security definer set search_path = '' as $$
  update public.requests r set
    vote_yes = c.yes, vote_no = c.no, verified_yes = c.vyes, verified_no = c.vno
  from (
    select count(*) filter (where v.verdict = 'approve') as yes,
           count(*) filter (where v.verdict = 'reject') as no,
           count(*) filter (where v.verdict = 'approve' and not u.is_anonymous) as vyes,
           count(*) filter (where v.verdict = 'reject' and not u.is_anonymous) as vno
    from public.votes v join auth.users u on u.id = v.user_id
    where v.request_id = rid and not private.is_banned(v.user_id)
  ) c
  where r.id = rid;
$$;
revoke all on function private.recount_votes(uuid) from public, anon, authenticated;

create or replace function public.sync_vote_counts() returns trigger
language plpgsql security definer set search_path = 'public' as $$
declare rid uuid;
begin
  for rid in
    select x from unnest(array[
      case when tg_op in ('INSERT', 'UPDATE') then new.request_id end,
      case when tg_op in ('DELETE', 'UPDATE') then old.request_id end
    ]) as x where x is not null group by x
  loop
    perform private.recount_votes(rid);
  end loop;
  return null;
end $$;

-- A guest who verifies their email: their earlier votes now count as verified.
create or replace function private.recount_after_verify() returns trigger
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  for rid in select v.request_id from public.votes v where v.user_id = new.id loop
    perform private.recount_votes(rid);
  end loop;
  return null;
end $$;
revoke all on function private.recount_after_verify() from public, anon, authenticated;
drop trigger if exists recount_votes_on_verify on auth.users;
create trigger recount_votes_on_verify after update of is_anonymous on auth.users
  for each row when (old.is_anonymous and not new.is_anonymous)
  execute function private.recount_after_verify();

create or replace function public.admin_set_banned(target uuid, ban boolean, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;
  if target = auth.uid() or exists (select 1 from public.admins a where a.user_id = target) then
    raise exception 'CANNOT_BAN_ADMIN';
  end if;
  if ban then
    insert into private.banned_users (user_id, reason, banned_by) values (target, left(reason, 200), auth.uid())
      on conflict (user_id) do update set reason = excluded.reason, banned_by = excluded.banned_by;
    -- An admin's personal block would hide this person's activity from moderation.
    delete from public.blocks where blocked_id = target and blocker_id in (select a.user_id from public.admins a);
  else
    delete from private.banned_users where user_id = target;
  end if;
  -- Recount every arzi this person voted on.
  for rid in select v.request_id from public.votes v where v.user_id = target loop
    perform private.recount_votes(rid);
  end loop;
end $$;

-- Fill in the verified counts for existing arzi.
select private.recount_votes(r.id) from public.requests r;

-- The feed shows them (a banned voter still sees their own vote counted, as with the totals).
create or replace view public.request_feed with (security_invoker = true) as
 select r.id, r.user_id, r.item, r.price_inr, r.category, r.reason, r.alternative, r.closes_at, r.outcome,
    r.created_at, p.handle,
    r.vote_yes + case when mv.verdict = 'approve'::public.verdict and mv.self_banned then 1 else 0 end as approve_count,
    r.vote_no + case when mv.verdict = 'reject'::public.verdict and mv.self_banned then 1 else 0 end as reject_count,
    ((select count(*) from public.comments c where c.request_id = r.id and not c.hidden))::integer as comment_count,
    mv.verdict as my_vote, r.link, r.demo_approve, r.demo_reject, r.hidden,
    r.verified_yes + case when mv.verdict = 'approve'::public.verdict and mv.self_banned and mv.self_verified then 1 else 0 end as verified_approve,
    r.verified_no + case when mv.verdict = 'reject'::public.verdict and mv.self_banned and mv.self_verified then 1 else 0 end as verified_reject
   from public.requests r
     join public.profiles p on p.id = r.user_id
     left join lateral (select v.verdict, private.is_banned(auth.uid()) as self_banned,
                               not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true) as self_verified
                        from public.votes v where v.request_id = r.id and v.user_id = auth.uid()) mv on true
  where not r.hidden or r.user_id = auth.uid() or public.is_admin();

-- The outsider preview: verified counts only once voting has closed, like the totals' split.
drop function if exists public.public_feed(text);
drop function if exists public.public_request(uuid);

create function public.public_feed(kind text default 'open')
returns table (
  id uuid, handle text, item text, price_inr integer, category text, reason text, alternative text,
  closes_at timestamptz, outcome public.outcome, created_at timestamptz, link text,
  approve_count integer, reject_count integer, vote_total integer, comment_count integer,
  demo_approve integer, demo_reject integer, preview boolean, verified_approve integer, verified_reject integer
)
language sql stable security definer set search_path = ''
as $$
  select r.id, p.handle, r.item, r.price_inr, r.category, r.reason, r.alternative,
         r.closes_at, r.outcome, r.created_at, r.link,
         case when o.is_open then 0 else r.vote_yes end,
         case when o.is_open then 0 else r.vote_no end,
         r.vote_yes + r.vote_no + coalesce(r.demo_approve, 0) + coalesce(r.demo_reject, 0),
         (select count(*) from public.comments c
           where c.request_id = r.id and not c.hidden and not private.is_banned(c.user_id))::integer,
         case when o.is_open then null else r.demo_approve end,
         case when o.is_open then null else r.demo_reject end,
         o.is_open,
         case when o.is_open then 0 else r.verified_yes end,
         case when o.is_open then 0 else r.verified_no end
  from public.requests r
  join public.profiles p on p.id = r.user_id
  cross join lateral (select r.closes_at > now() as is_open) o
  where not r.hidden and not private.is_banned(r.user_id)
    and o.is_open = (kind = 'open')
    and kind in ('open', 'closed')
  order by case when kind = 'open' then r.created_at else r.closes_at end desc
  limit case when kind = 'open' then 100 else 50 end
$$;

create function public.public_request(target uuid)
returns table (
  id uuid, handle text, item text, price_inr integer, category text, reason text, alternative text,
  closes_at timestamptz, outcome public.outcome, created_at timestamptz, link text,
  approve_count integer, reject_count integer, vote_total integer, comment_count integer,
  demo_approve integer, demo_reject integer, preview boolean, verified_approve integer, verified_reject integer
)
language sql stable security definer set search_path = ''
as $$
  select r.id, p.handle, r.item, r.price_inr, r.category, r.reason, r.alternative,
         r.closes_at, r.outcome, r.created_at, r.link,
         case when o.is_open then 0 else r.vote_yes end,
         case when o.is_open then 0 else r.vote_no end,
         r.vote_yes + r.vote_no + coalesce(r.demo_approve, 0) + coalesce(r.demo_reject, 0),
         (select count(*) from public.comments c
           where c.request_id = r.id and not c.hidden and not private.is_banned(c.user_id))::integer,
         case when o.is_open then null else r.demo_approve end,
         case when o.is_open then null else r.demo_reject end,
         o.is_open,
         case when o.is_open then 0 else r.verified_yes end,
         case when o.is_open then 0 else r.verified_no end
  from public.requests r
  join public.profiles p on p.id = r.user_id
  cross join lateral (select r.closes_at > now() as is_open) o
  where r.id = target and not r.hidden and not private.is_banned(r.user_id)
$$;

revoke all on function public.public_feed(text), public.public_request(uuid) from public;
grant execute on function public.public_feed(text), public.public_request(uuid) to anon, authenticated;
