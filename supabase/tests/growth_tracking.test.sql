-- Growth tracking (20 Nov): first-touch source on the profile, and the poster's OK to feature an arzi.
-- People: P = poster  A, B = other people  G = guest (anonymous)
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('77777777-7777-4777-8777-000000000001', 'authenticated', 'authenticated', 'p7@example.com', false),
  ('77777777-7777-4777-8777-000000000002', 'authenticated', 'authenticated', 'a7@example.com', false),
  ('77777777-7777-4777-8777-000000000003', 'authenticated', 'authenticated', 'b7@example.com', false),
  ('77777777-7777-4777-8777-000000000004', 'authenticated', 'authenticated', null, true);

\set P '{"sub":"77777777-7777-4777-8777-000000000001","role":"authenticated","is_anonymous":false}'
\set A '{"sub":"77777777-7777-4777-8777-000000000002","role":"authenticated","is_anonymous":false}'
\set B '{"sub":"77777777-7777-4777-8777-000000000003","role":"authenticated","is_anonymous":false}'
\set G '{"sub":"77777777-7777-4777-8777-000000000004","role":"authenticated","is_anonymous":true}'
\set src 'select source from public.profiles where id = '

-- ── Source: set once, short codes only ───────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', :'A', true);
select lives_ok($$select public.set_source('IG')$$, 'a person can record where they came from');
select lives_ok($$select public.set_source('rd-sideproject')$$, 'a second source is accepted without error');
select set_config('request.jwt.claims', :'B', true);
select lives_ok($$select public.set_source('ig reels!')$$, 'a source that is not a short code is ignored, not an error');
select lives_ok($$select public.set_source('x')$$, 'a one-letter source is ignored');
select set_config('request.jwt.claims', :'G', true);
select lives_ok($$select public.set_source('wa')$$, 'guests can record a source too');
reset role;
select is((:src '77777777-7777-4777-8777-000000000002'), 'ig', 'the first source is kept, in lower case');
select is((:src '77777777-7777-4777-8777-000000000003'), null, 'invalid sources leave it empty');
select is((:src '77777777-7777-4777-8777-000000000004'), 'wa', 'a guest''s source is kept');

-- Nobody can read or change sources directly; outsiders can't call the function.
set local role authenticated;
select set_config('request.jwt.claims', :'A', true);
select throws_ok($$select source from public.profiles$$, '42501', null, 'people cannot read sources');
update public.profiles set source = 'hn' where id = auth.uid();
reset role;
select is((:src '77777777-7777-4777-8777-000000000002'), 'ig', 'people cannot overwrite their source directly');
set local role anon;
select throws_ok($$select public.set_source('ig')$$, '42501', null, 'outsiders cannot call set_source');
reset role;
select throws_ok($$update public.profiles set source = 'Not Valid' where id = '77777777-7777-4777-8777-000000000003'$$,
  '23514', null, 'the database itself refuses a malformed source');

-- ── OK to feature ────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', :'P', true);
select lives_ok($$insert into public.requests (id, user_id, item, price_inr, category, reason) values
  ('88888888-8888-4888-8888-000000000001', '77777777-7777-4777-8777-000000000001', 'Feature test one', 1999, 'other', 'Testing the default value')$$,
  'posting without the box works');
select lives_ok($$insert into public.requests (id, user_id, item, price_inr, category, reason, feature_ok) values
  ('88888888-8888-4888-8888-000000000002', '77777777-7777-4777-8777-000000000001', 'Feature test two', 2999, 'other', 'Testing the ticked box', true)$$,
  'posting with the box ticked works');
select is((select feature_ok from public.request_feed where id = '88888888-8888-4888-8888-000000000001'), false,
  'the box is off unless ticked');
select is((select feature_ok from public.request_feed where id = '88888888-8888-4888-8888-000000000002'), true,
  'a ticked box is saved and shows in the feed');
select lives_ok($$update public.requests set feature_ok = false where id = '88888888-8888-4888-8888-000000000002'$$,
  'the poster can take their OK back');
select set_config('request.jwt.claims', :'A', true);
update public.requests set feature_ok = true where id = '88888888-8888-4888-8888-000000000001';
reset role;
select is((select feature_ok from public.requests where id = '88888888-8888-4888-8888-000000000002'), false,
  'the poster''s change stuck');
select is((select feature_ok from public.requests where id = '88888888-8888-4888-8888-000000000001'), false,
  'nobody else can give the OK for someone''s arzi');

select * from finish();
rollback;
