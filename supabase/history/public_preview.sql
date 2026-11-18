-- Read-only preview for people who aren't signed in yet, so a new phone sees arzi at once
-- while the bot check and sign-in run in the background. Voting, posting and commenting still
-- need an account (and so the bot check).
--
-- What an outsider gets: open and closed arzi that are visible to everyone (not hidden, author
-- not banned), their random names, and comments on them.
-- What an outsider never gets: user ids, any single person's vote, or the yes/no split of an
-- arzi that is still open (only its total, so nobody can copy the crowd before voting).

create or replace function public.public_feed(kind text default 'open')
returns table (
  id uuid, handle text, item text, price_inr integer, category text, reason text, alternative text,
  closes_at timestamptz, outcome public.outcome, created_at timestamptz, link text,
  approve_count integer, reject_count integer, vote_total integer, comment_count integer,
  demo_approve integer, demo_reject integer, preview boolean
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
         o.is_open
  from public.requests r
  join public.profiles p on p.id = r.user_id
  cross join lateral (select r.closes_at > now() as is_open) o
  where not r.hidden and not private.is_banned(r.user_id)
    and o.is_open = (kind = 'open')
    and kind in ('open', 'closed')
  order by case when kind = 'open' then r.created_at else r.closes_at end desc
  limit case when kind = 'open' then 100 else 50 end
$$;

create or replace function public.public_request(target uuid)
returns table (
  id uuid, handle text, item text, price_inr integer, category text, reason text, alternative text,
  closes_at timestamptz, outcome public.outcome, created_at timestamptz, link text,
  approve_count integer, reject_count integer, vote_total integer, comment_count integer,
  demo_approve integer, demo_reject integer, preview boolean
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
         o.is_open
  from public.requests r
  join public.profiles p on p.id = r.user_id
  cross join lateral (select r.closes_at > now() as is_open) o
  where r.id = target and not r.hidden and not private.is_banned(r.user_id)
$$;

create or replace function public.public_comments(target uuid)
returns table (id uuid, request_id uuid, handle text, body text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.request_id, p.handle, c.body, c.created_at
  from public.comments c
  join public.profiles p on p.id = c.user_id
  join public.requests r on r.id = c.request_id
  where c.request_id = target
    and not c.hidden and not private.is_banned(c.user_id)
    and not r.hidden and not private.is_banned(r.user_id)
  order by c.created_at
  limit 200
$$;

revoke all on function public.public_feed(text), public.public_request(uuid), public.public_comments(uuid) from public;
grant execute on function public.public_feed(text), public.public_request(uuid), public.public_comments(uuid) to anon, authenticated;
