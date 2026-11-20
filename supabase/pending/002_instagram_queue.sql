-- Instagram posting queue (20 Nov 2026)
-- Posts for @rukozara.app wait here until their time comes; the Edge Function `ig-publish` (pg_cron,
-- every 15 minutes) publishes them through Instagram's official API. Nothing goes out without
-- approved_at (Arpit's yes in chat). Media must live in our own website's /social folder.
-- The access token is the Vault secret 'instagram_token' (Arpit saves it in the dashboard).
-- Only the server key can touch any of this; outsiders and signed-in people can't.

-- Media may only come from our own site, as JPEG images or MP4 video.
create or replace function private.ig_urls_ok(urls text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(u ~ '^https://arpitpalod\.github\.io/ruko-zara/social/[A-Za-z0-9._-]+\.(jpg|jpeg|mp4)$'), false)
  from unnest(urls) u
$$;

create table if not exists private.ig_posts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('image', 'carousel', 'reel')),
  media_urls   text[] not null check (private.ig_urls_ok(media_urls)),
  cover_url    text check (cover_url is null or private.ig_urls_ok(array[cover_url])),
  caption      text not null check (char_length(caption) between 1 and 2200),
  publish_at   timestamptz not null,
  approved_at  timestamptz,                 -- Arpit's yes; unapproved posts are never published
  status       text not null default 'queued'
               check (status in ('queued', 'processing', 'published', 'failed', 'cancelled')),
  container_id text,                        -- Instagram's id for the upload while it is processed
  ig_media_id  text,
  permalink    text,
  attempts     int not null default 0,
  last_error   text,
  created_at   timestamptz not null default now(),
  published_at timestamptz,
  constraint ig_posts_media_count check (
    (kind = 'carousel' and cardinality(media_urls) between 2 and 10)
    or (kind <> 'carousel' and cardinality(media_urls) = 1)),
  constraint ig_posts_media_type check (
    (kind = 'reel') = (media_urls[1] ~ '\.mp4$'))
);
revoke all on private.ig_posts from public, anon, authenticated;

-- What the publisher should work on now: approved posts that are due, and uploads still processing.
create or replace function public.ig_work()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(p) order by p.publish_at), '[]'::jsonb)
  from (
    select id, kind, media_urls, cover_url, caption, status, container_id, attempts, publish_at
    from private.ig_posts
    where approved_at is not null
      and publish_at <= now()
      and status in ('queued', 'processing')
    order by publish_at
    limit 3
  ) p
$$;

-- The publisher reports back. An error counts as an attempt; the third one gives up and emails Arpit.
-- p_clear_container drops an upload Instagram rejected, so the next run uploads the media again.
create or replace function public.ig_update(
  p_id uuid,
  p_status text,
  p_container_id text default null,
  p_media_id text default null,
  p_permalink text default null,
  p_error text default null,
  p_clear_container boolean default false)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  post private.ig_posts;
begin
  if p_status not in ('queued', 'processing', 'published') then
    raise exception 'ig_update: status % is not allowed', p_status;
  end if;
  update private.ig_posts
     set status       = case when p_error is not null and attempts + 1 >= 3 then 'failed' else p_status end,
         container_id = case when p_clear_container then null else coalesce(p_container_id, container_id) end,
         ig_media_id  = coalesce(p_media_id, ig_media_id),
         permalink    = coalesce(p_permalink, permalink),
         attempts     = attempts + (p_error is not null)::int,
         last_error   = coalesce(left(p_error, 1000), last_error),
         published_at = case when p_status = 'published' then now() else published_at end
   where id = p_id
  returning * into post;
  if post.status = 'failed' then
    insert into private.alerts (subject, body) values (
      'Instagram post failed',
      format('This post could not be published after 3 tries.%sCaption: %s%sLast error: %s',
             E'\n\n', left(post.caption, 200), E'\n', post.last_error));
  end if;
end
$$;

-- The access token, and the date it was last saved (the publisher renews it every week).
create or replace function public.ig_token()
returns table (token text, saved_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.decrypted_secret, s.updated_at
  from vault.decrypted_secrets s
  where s.name = 'instagram_token'
$$;

create or replace function public.ig_set_token(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_id uuid := (select id from vault.secrets where name = 'instagram_token');
begin
  if p_token is null or char_length(p_token) < 20 then
    raise exception 'ig_set_token: that is not a token';
  end if;
  if secret_id is null then
    raise exception 'ig_set_token: no instagram_token secret to renew';
  end if;
  perform vault.update_secret(secret_id, p_token);
end
$$;

revoke all on function public.ig_work() from public, anon, authenticated;
revoke all on function public.ig_update(uuid, text, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.ig_token() from public, anon, authenticated;
revoke all on function public.ig_set_token(text) from public, anon, authenticated;
revoke all on function private.ig_urls_ok(text[]) from public, anon, authenticated;
grant execute on function public.ig_work() to service_role;
grant execute on function public.ig_update(uuid, text, text, text, text, text, boolean) to service_role;
grant execute on function public.ig_token() to service_role;
grant execute on function public.ig_set_token(text) to service_role;
