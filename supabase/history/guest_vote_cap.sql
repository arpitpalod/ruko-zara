-- Applied as migration "guest_vote_cap" (18 Nov 2026).
-- Guests (anonymous accounts) can vote on up to 20 arzi; changing an existing vote is always allowed.
-- Votes have no delete policy, so a guest can't free up slots by removing votes.
create or replace function public.guest_vote_limit() returns int
language sql immutable set search_path = '' as $$ select 20 $$;

create or replace function public.guest_vote_cap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce((select u.is_anonymous from auth.users u where u.id = new.user_id), false) then
    return new;
  end if;
  -- one check at a time per user, so parallel requests can't slip past the cap
  perform pg_advisory_xact_lock(hashtextextended('guest_vote:' || new.user_id::text, 0));
  if exists (select 1 from public.votes v where v.user_id = new.user_id and v.request_id = new.request_id) then
    return new; -- vote change (upsert), not a new vote
  end if;
  if (select count(*) from public.votes v where v.user_id = new.user_id) >= public.guest_vote_limit() then
    raise exception 'GUEST_VOTE_LIMIT' using hint = 'Sign in to keep voting';
  end if;
  return new;
end $$;

drop trigger if exists votes_guest_cap on public.votes;
create trigger votes_guest_cap before insert on public.votes
  for each row execute function public.guest_vote_cap();
revoke all on function public.guest_vote_cap() from public, anon, authenticated;

-- Free votes left for the current guest; null for signed-in users.
create or replace function public.guest_votes_left() returns int
language sql stable security definer set search_path = '' as $$
  select case when u.is_anonymous
    then greatest(0, public.guest_vote_limit() - (select count(*) from public.votes v where v.user_id = u.id))::int
    else null end
  from auth.users u where u.id = auth.uid()
$$;
revoke all on function public.guest_votes_left() from public, anon;
grant execute on function public.guest_votes_left() to authenticated;
