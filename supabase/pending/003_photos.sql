-- Product photos on arzi (Arpit's OK, 25 Nov; kept on our own server at his suggestion).
-- * Storage bucket "photos": public to view, only the server can add files (no upload rules for app users).
-- * requests.photo: the photo's file name, which can only be "<this arzi's id>.jpg/png/webp", so it can
--   never point anywhere else. Only the server sets it: the link-preview function ("photo_for" mode) reads
--   the link from the database itself, copies a small version of the shop's photo into the bucket, and
--   fills this once. A trigger asks for it right after an arzi with a link is saved. Posting never waits
--   for or fails on it.
-- * Safety fix found while adding it: people posting an arzi could also send their own vote totals,
--   demo votes and "verdict emailed" time. Those are now reset when app users post.
-- * The feed, the arzi page and the logged-out previews return the photo.

-- (The test copy runs without storage, so the bucket is made only where storage exists.)
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('photos', 'photos', true, 1000000, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
  end if;
end $$;

alter table public.requests add column if not exists photo text
  constraint requests_photo_check check (photo is null or photo in (id::text || '.jpg', id::text || '.png', id::text || '.webp'));
grant select (photo) on public.requests to authenticated;

-- App users post arzi; the server alone sets these. (Not security definer: current_user is the caller.)
create or replace function private.reset_server_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.photo := null;
    new.vote_yes := 0;
    new.vote_no := 0;
    new.verified_yes := 0;
    new.verified_no := 0;
    new.demo_approve := 0;
    new.demo_reject := 0;
    new.verdict_emailed_at := null;
  end if;
  return new;
end $$;
revoke all on function private.reset_server_fields() from public;
drop trigger if exists requests_server_fields on public.requests;
create trigger requests_server_fields before insert on public.requests
  for each row execute function private.reset_server_fields();

-- Right after an arzi with a shop link is saved, ask the link-preview function for its photo.
-- Same call pattern as the alert sender. Any failure here is ignored: a photo is never a reason to lose an arzi.
create or replace function private.ask_for_photo() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  key text;
begin
  select decrypted_secret into base from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into key from vault.decrypted_secrets where name = 'anon_jwt';
  if base is not null and key is not null then
    perform net.http_post(
      url := base || '/functions/v1/link-preview',
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || key),
      body := jsonb_build_object('photo_for', new.id),
      timeout_milliseconds := 30000
    );
  end if;
  return null;
exception when others then
  return null;
end $$;
revoke all on function private.ask_for_photo() from public;
drop trigger if exists requests_photo on public.requests;
create trigger requests_photo after insert on public.requests
  for each row when (new.link is not null) execute function private.ask_for_photo();

-- The feed and arzi page (signed in): same as before, plus the photo at the end.
create or replace view public.request_feed with (security_invoker = true) as
 select r.id,
    r.user_id,
    r.item,
    r.price_inr,
    r.category,
    r.reason,
    r.alternative,
    r.closes_at,
    r.outcome,
    r.created_at,
    p.handle,
    (r.vote_yes + case when mv.verdict = 'approve'::public.verdict and mv.self_banned then 1 else 0 end) as approve_count,
    (r.vote_no + case when mv.verdict = 'reject'::public.verdict and mv.self_banned then 1 else 0 end) as reject_count,
    ((select count(*) from public.comments c where c.request_id = r.id and not c.hidden))::integer as comment_count,
    mv.verdict as my_vote,
    r.link,
    r.demo_approve,
    r.demo_reject,
    r.hidden,
    (r.verified_yes + case when mv.verdict = 'approve'::public.verdict and mv.self_banned and mv.self_verified then 1 else 0 end) as verified_approve,
    (r.verified_no + case when mv.verdict = 'reject'::public.verdict and mv.self_banned and mv.self_verified then 1 else 0 end) as verified_reject,
    r.feature_ok,
    r.photo
   from public.requests r
     join public.profiles p on p.id = r.user_id
     left join lateral (
       select v.verdict,
              private.is_banned(auth.uid()) as self_banned,
              (not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, true)) as self_verified
         from public.votes v
        where v.request_id = r.id and v.user_id = auth.uid()
     ) mv on true
  where (not r.hidden) or r.user_id = auth.uid() or public.is_admin();

-- Logged-out previews: the return type changes, so they're recreated (same body, plus the photo).
drop function if exists public.public_feed(text);
create function public.public_feed(kind text default 'open')
returns table(id uuid, handle text, item text, price_inr integer, category text, reason text, alternative text,
  closes_at timestamptz, outcome public.outcome, created_at timestamptz, link text, approve_count integer,
  reject_count integer, vote_total integer, comment_count integer, demo_approve integer, demo_reject integer,
  preview boolean, verified_approve integer, verified_reject integer, photo text)
language sql stable security definer set search_path = '' as $$
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
         case when o.is_open then 0 else r.verified_no end,
         r.photo
  from public.requests r
  join public.profiles p on p.id = r.user_id
  cross join lateral (select r.closes_at > now() as is_open) o
  where not r.hidden and not private.is_banned(r.user_id)
    and o.is_open = (kind = 'open')
    and kind in ('open', 'closed')
  order by case when kind = 'open' then r.created_at else r.closes_at end desc
  limit case when kind = 'open' then 100 else 50 end
$$;
revoke all on function public.public_feed(text) from public;
grant execute on function public.public_feed(text) to anon, authenticated, service_role;

drop function if exists public.public_request(uuid);
create function public.public_request(target uuid)
returns table(id uuid, handle text, item text, price_inr integer, category text, reason text, alternative text,
  closes_at timestamptz, outcome public.outcome, created_at timestamptz, link text, approve_count integer,
  reject_count integer, vote_total integer, comment_count integer, demo_approve integer, demo_reject integer,
  preview boolean, verified_approve integer, verified_reject integer, photo text)
language sql stable security definer set search_path = '' as $$
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
         case when o.is_open then 0 else r.verified_no end,
         r.photo
  from public.requests r
  join public.profiles p on p.id = r.user_id
  cross join lateral (select r.closes_at > now() as is_open) o
  where r.id = target and not r.hidden and not private.is_banned(r.user_id)
$$;
revoke all on function public.public_request(uuid) from public;
grant execute on function public.public_request(uuid) to anon, authenticated, service_role;
