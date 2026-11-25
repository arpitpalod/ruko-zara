-- Product photos (25 Nov): kept on our server; only the server sets an arzi's photo; posting can't fake photos or vote counts.
-- People: P = poster (verified)  A = another person
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('99999999-9999-4999-8999-000000000001', 'authenticated', 'authenticated', 'p9@example.com', false),
  ('99999999-9999-4999-8999-000000000002', 'authenticated', 'authenticated', 'a9@example.com', false);

\set P '{"sub":"99999999-9999-4999-8999-000000000001","role":"authenticated","is_anonymous":false}'
\set A '{"sub":"99999999-9999-4999-8999-000000000002","role":"authenticated","is_anonymous":false}'
\set row 'select photo, vote_yes, vote_no, verified_yes, verified_no, demo_approve, demo_reject, verdict_emailed_at from public.requests where id = '

-- ── Posting: photo and counts sent by the poster are dropped ─────────────────
set local role authenticated;
select set_config('request.jwt.claims', :'P', true);
select lives_ok($$insert into public.requests (id, user_id, item, price_inr, category, reason, link, photo,
    vote_yes, vote_no, verified_yes, verified_no, demo_approve, demo_reject, verdict_emailed_at)
  values ('99999999-0000-4000-8000-000000000001', '99999999-9999-4999-8999-000000000001', 'Mattress', 15000, 'Home',
    'Back hurts every morning now', 'https://www.amazon.in/dp/B0TEST0001', '99999999-0000-4000-8000-000000000001.jpg',
    500, 7, 400, 3, 90, 1, now())$$,
  'an arzi with a shop link can still be posted');
select lives_ok($$insert into public.requests (id, user_id, item, price_inr, category, reason)
  values ('99999999-0000-4000-8000-000000000002', '99999999-9999-4999-8999-000000000001', 'Shoes', 4000, 'Fashion',
    'Old pair is completely torn now')$$,
  'an arzi without a link can still be posted');
reset role;
select results_eq(format('%s %L', :'row', '99999999-0000-4000-8000-000000000001'),
  $$values (null::text, 0, 0, 0, 0, 0, 0, null::timestamptz)$$,
  'the poster cannot set the photo, vote totals, demo votes or verdict email time');

-- ── Changing it later: nobody but the server ─────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', :'P', true);
select throws_ok($$update public.requests set photo = '99999999-0000-4000-8000-000000000001.jpg'
  where id = '99999999-0000-4000-8000-000000000001'$$, '42501', null, 'the poster cannot change the photo');
select set_config('request.jwt.claims', :'A', true);
select throws_ok($$update public.requests set photo = '99999999-0000-4000-8000-000000000001.jpg'
  where id = '99999999-0000-4000-8000-000000000001'$$, '42501', null, 'others cannot change the photo');

reset role;

-- The server (service role) fills it; the only allowed name is this arzi's own photo file.
set local role service_role;
select throws_ok($$update public.requests set photo = 'https://evil.example.com/x.png'
  where id = '99999999-0000-4000-8000-000000000001'$$, '23514', null, 'a photo cannot be an outside address');
select throws_ok($$update public.requests set photo = '99999999-0000-4000-8000-000000000002.jpg'
  where id = '99999999-0000-4000-8000-000000000001'$$, '23514', null, 'a photo cannot be another arzi''s photo');
select throws_ok($$update public.requests set photo = '99999999-0000-4000-8000-000000000001.svg'
  where id = '99999999-0000-4000-8000-000000000001'$$, '23514', null, 'only jpg, png and webp');
select lives_ok($$update public.requests set photo = '99999999-0000-4000-8000-000000000001.jpg'
  where id = '99999999-0000-4000-8000-000000000001'$$, 'the server can save the photo');
reset role;
-- (The bucket itself is checked on the live database: the test copy runs without storage.)
select is((select count(*) from pg_policies where schemaname = 'storage' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')),
  0::bigint, 'no rule lets app users add, change or delete stored files');

-- ── Everyone sees it: feed, arzi page, logged-out previews ───────────────────
set local role authenticated;
select set_config('request.jwt.claims', :'A', true);
select is((select photo from public.request_feed where id = '99999999-0000-4000-8000-000000000001'),
  '99999999-0000-4000-8000-000000000001.jpg', 'signed-in people see the photo');
select is((select photo from public.request_feed where id = '99999999-0000-4000-8000-000000000002'),
  null, 'an arzi without a link has no photo');
reset role;
set local role anon;
select is((select photo from public.public_request('99999999-0000-4000-8000-000000000001')),
  '99999999-0000-4000-8000-000000000001.jpg', 'logged-out arzi page shows the photo');
select ok(exists(select 1 from public.public_feed('open') where id = '99999999-0000-4000-8000-000000000001'
  and photo = '99999999-0000-4000-8000-000000000001.jpg'), 'logged-out feed shows the photo');
select throws_ok($$select photo from public.requests$$, '42501', null, 'outsiders still cannot read the table');
reset role;

select * from finish();
rollback;
