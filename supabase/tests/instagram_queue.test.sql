-- Instagram posting queue: only approved, due posts go out; media only from our own site; only the
-- server can read the queue and the token; three failures give up and alert the owner.
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

\set SITE 'https://arpitpalod.github.io/ruko-zara/social/'
\set U '{"sub":"99999999-9999-4999-8999-000000000001","role":"authenticated","is_anonymous":false}'
insert into auth.users (id, aud, role, email, is_anonymous) values
  ('99999999-9999-4999-8999-000000000001', 'authenticated', 'authenticated', 'ig-test@example.com', false);

-- ── What may go in the queue ────────────────────────────────────────────────
select throws_ok(format($$insert into private.ig_posts (kind, media_urls, caption, publish_at)
  values ('image', array['https://evil.example.com/x.jpg'], 'hi', now())$$), '23514', null,
  'media from another site is refused');
select throws_ok(format($$insert into private.ig_posts (kind, media_urls, caption, publish_at)
  values ('image', array['%sx.png'], 'hi', now())$$, :'SITE'), '23514', null, 'PNG is refused (Instagram takes JPEG only)');
select throws_ok(format($$insert into private.ig_posts (kind, media_urls, caption, publish_at)
  values ('carousel', array['%sa.jpg'], 'hi', now())$$, :'SITE'), '23514', null, 'a carousel needs at least 2 images');
select throws_ok(format($$insert into private.ig_posts (kind, media_urls, caption, publish_at)
  values ('reel', array['%sa.jpg'], 'hi', now())$$, :'SITE'), '23514', null, 'a reel must be a video');

insert into private.ig_posts (id, kind, media_urls, caption, publish_at, approved_at) values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'image', array[:'SITE' || 'due.jpg'], 'approved and due', now() - interval '1 minute', now()),
  ('aaaaaaaa-0000-4000-8000-000000000002', 'image', array[:'SITE' || 'notyet.jpg'], 'approved, later', now() + interval '1 day', now()),
  ('aaaaaaaa-0000-4000-8000-000000000003', 'carousel', array[:'SITE' || 'a.jpg', :'SITE' || 'b.jpg'], 'due but not approved', now() - interval '1 hour', null),
  ('aaaaaaaa-0000-4000-8000-000000000004', 'reel', array[:'SITE' || 'r.mp4'], 'processing', now() - interval '1 hour', now());
update private.ig_posts set status = 'processing', container_id = 'c-1' where id = 'aaaaaaaa-0000-4000-8000-000000000004';

-- ── Only the server can reach it ────────────────────────────────────────────
set local role anon;
select throws_ok($$select public.ig_work()$$, '42501', null, 'outsiders cannot see the queue');
select throws_ok($$select * from public.ig_token()$$, '42501', null, 'outsiders cannot read the Instagram token');
select throws_ok($$select public.ig_set_token('x')$$, '42501', null, 'outsiders cannot replace the token');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', :'U', true);
select throws_ok($$select public.ig_work()$$, '42501', null, 'signed-in people cannot see the queue');
select throws_ok($$select * from public.ig_token()$$, '42501', null, 'signed-in people cannot read the token');
select throws_ok($$select public.ig_update('aaaaaaaa-0000-4000-8000-000000000001', 'published')$$, '42501', null,
  'signed-in people cannot mark posts published');
select throws_ok($$select * from private.ig_posts$$, '42501', null, 'signed-in people cannot read the queue table');
reset role;

-- ── The publisher's view of the queue ───────────────────────────────────────
set local role service_role;
select is(
  (select array_agg(x->>'id' order by x->>'id') from jsonb_array_elements(public.ig_work()) x),
  array['aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000004'],
  'only approved posts that are due (or still processing) come out');

-- Success
select lives_ok($$select public.ig_update('aaaaaaaa-0000-4000-8000-000000000001', 'published', null, 'm-1', 'https://www.instagram.com/p/x/')$$,
  'the publisher can mark a post published');
-- Three failures
select public.ig_update('aaaaaaaa-0000-4000-8000-000000000004', 'processing', null, null, null, 'video still bad');
select public.ig_update('aaaaaaaa-0000-4000-8000-000000000004', 'processing', null, null, null, 'video still bad');
select public.ig_update('aaaaaaaa-0000-4000-8000-000000000004', 'processing', null, null, null, 'video still bad');
select throws_ok($$select public.ig_update('aaaaaaaa-0000-4000-8000-000000000001', 'failed')$$, 'P0001', null,
  'the publisher cannot set any status it likes');
reset role;

select is((select status from private.ig_posts where id = 'aaaaaaaa-0000-4000-8000-000000000001'), 'published', 'published post is marked');
select isnt((select published_at from private.ig_posts where id = 'aaaaaaaa-0000-4000-8000-000000000001'), null, 'and dated');
select is((select status from private.ig_posts where id = 'aaaaaaaa-0000-4000-8000-000000000004'), 'failed', 'three errors give up');
select is((select count(*)::int from private.alerts where subject = 'Instagram post failed'), 1, 'and the owner gets one alert');
set local role service_role;
select is(jsonb_array_length(public.ig_work()), 0, 'published and failed posts are not picked up again');
reset role;

-- ── The token ───────────────────────────────────────────────────────────────
select vault.create_secret('first-token-1234567890abcdef', 'instagram_token');
set local role service_role;
select is((select token from public.ig_token()), 'first-token-1234567890abcdef', 'the publisher reads the token');
select throws_ok($$select public.ig_set_token('short')$$, 'P0001', null, 'a non-token is refused');
select lives_ok($$select public.ig_set_token('second-token-1234567890abcdef')$$, 'the publisher saves a renewed token');
select is((select token from public.ig_token()), 'second-token-1234567890abcdef', 'the renewed token is the one used');
reset role;

select * from finish();
rollback;
