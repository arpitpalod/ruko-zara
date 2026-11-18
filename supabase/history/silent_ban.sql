-- Silent ban (shadow ban), set by admins.
-- A banned person can keep using the app and sees nothing unusual, but nothing they do reaches anyone else:
--   * their arzi and comments are visible only to themselves (and admins)
--   * their votes don't count in anyone else's totals (they still see their own vote counted)
--   * their reports are ignored
-- The ban list lives in a schema the API does not expose, so nobody can look up who is banned.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create table if not exists private.banned_users (
  user_id    uuid primary key references auth.users on delete cascade,
  reason     text check (char_length(reason) <= 200),
  banned_by  uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);
revoke all on private.banned_users from public, anon, authenticated;

create or replace function private.is_banned(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.banned_users b where b.user_id = uid)
$$;
revoke all on function private.is_banned(uuid) from public;
grant execute on function private.is_banned(uuid) to authenticated, service_role;

-- Reading: a banned person's arzi and comments are visible only to them and to admins.
drop policy if exists "requests read" on public.requests;
create policy "requests read" on public.requests for select to authenticated
  using ((user_id = auth.uid() or public.is_admin() or (not hidden and not private.is_banned(user_id)))
         and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = requests.user_id));

drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select to authenticated
  using ((user_id = auth.uid() or public.is_admin() or (not hidden and not private.is_banned(user_id)))
         and not exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = comments.user_id));

-- Vote totals leave out banned voters.
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
    update public.requests set
      vote_yes = (select count(*) from public.votes v where v.request_id = rid and v.verdict = 'approve' and not private.is_banned(v.user_id)),
      vote_no  = (select count(*) from public.votes v where v.request_id = rid and v.verdict = 'reject' and not private.is_banned(v.user_id))
    where id = rid;
  end loop;
  return null;
end $$;

-- The banned person still sees their own vote in the totals, so nothing looks off to them.
create or replace view public.request_feed with (security_invoker = true) as
select r.id, r.user_id, r.item, r.price_inr, r.category, r.reason, r.alternative,
  r.closes_at, r.outcome, r.created_at, p.handle,
  r.vote_yes + case when mv.verdict = 'approve' and mv.self_banned then 1 else 0 end as approve_count,
  r.vote_no + case when mv.verdict = 'reject' and mv.self_banned then 1 else 0 end as reject_count,
  (select count(*) from public.comments c where c.request_id = r.id and not c.hidden)::int as comment_count,
  mv.verdict as my_vote,
  r.link, r.demo_approve, r.demo_reject, r.hidden
from public.requests r
join public.profiles p on p.id = r.user_id
left join lateral (
  select v.verdict, private.is_banned(auth.uid()) as self_banned
  from public.votes v where v.request_id = r.id and v.user_id = auth.uid()
) mv on true
where not r.hidden or r.user_id = auth.uid() or public.is_admin();

-- Reports from banned people don't count towards auto-hiding.
create or replace function public.auto_hide() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports r
      where r.target_type = new.target_type and r.target_id = new.target_id
        and not private.is_banned(r.user_id)) >= 3 then
    if new.target_type = 'request' then
      update public.requests set hidden = true where id = new.target_id;
    else
      update public.comments set hidden = true where id = new.target_id;
    end if;
  end if;
  return new;
end $$;

-- Admin controls.
create or replace function public.admin_set_banned(target uuid, ban boolean, reason text default null)
returns void language plpgsql security definer set search_path = '' as $$
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
  update public.requests r set
    vote_yes = (select count(*) from public.votes v where v.request_id = r.id and v.verdict = 'approve' and not private.is_banned(v.user_id)),
    vote_no  = (select count(*) from public.votes v where v.request_id = r.id and v.verdict = 'reject' and not private.is_banned(v.user_id))
  where r.id in (select v.request_id from public.votes v where v.user_id = target);
end $$;
revoke all on function public.admin_set_banned(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_banned(uuid, boolean, text) to authenticated;

create or replace function public.admin_banned_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select b.user_id from private.banned_users b where public.is_admin()
$$;
revoke all on function public.admin_banned_ids() from public, anon;
grant execute on function public.admin_banned_ids() to authenticated;
