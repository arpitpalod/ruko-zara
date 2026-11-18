-- Security & rules tests for Ruko Zara, run on a fresh copy of the live database schema.
-- Everything happens inside one transaction that is rolled back at the end.
--
-- People:  A = poster (verified)   G = guest (anonymous)   V = verified voter   M = admin
-- Arzi:    R1..R22 open arzi by A,  RH = hidden arzi by A
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

-- ── Setup (as the database owner) ─────────────────────────────────────────────
insert into auth.users (id, aud, role, email, is_anonymous) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'poster@example.com', false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', null, true),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'authenticated', 'authenticated', 'voter@example.com', false),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'authenticated', 'authenticated', 'admin@example.com', false);
insert into public.admins (user_id) values ('dddddddd-dddd-dddd-dddd-dddddddddddd');

alter table public.requests disable trigger requests_rate_limit;  -- setup only: 23 arzi by one person
insert into public.requests (id, user_id, item, price_inr, category, reason)
  select ('00000000-0000-0000-0001-' || lpad(g::text, 12, '0'))::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         'Test item ' || g, 1000 + g, 'other', 'Need it for a proper test'
  from generate_series(1, 22) g;
insert into public.requests (id, user_id, item, price_inr, category, reason, hidden) values
  ('00000000-0000-0000-0002-000000000001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Hidden thing', 500, 'other', 'Reported by three people', true);
alter table public.requests enable trigger requests_rate_limit;
insert into public.votes (request_id, user_id, verdict) values
  ('00000000-0000-0000-0001-000000000002', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'approve');

select ok((select count(*) from public.profiles where id in (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd')) = 4,
  'every new account gets a profile with a random name');

select word as bad_word from public.blocked_words order by word limit 1 \gset
select domain as shop_domain from public.allowed_link_domains order by domain limit 1 \gset

-- ── 1. Outsider: not signed in at all ─────────────────────────────────────────
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select * from public.' || t, '42501', null, 'outsider cannot read ' || t)
from unnest(array['profiles', 'requests', 'votes', 'comments', 'reports', 'blocks',
                  'admins', 'blocked_words', 'allowed_link_domains', 'request_feed']) t;
select throws_ok('select public.guest_votes_left()', '42501', null, 'outsider cannot call guest_votes_left');
select throws_ok('select public.is_admin()', '42501', null, 'outsider cannot call is_admin');
select throws_ok($$select public.admin_set_hidden('request', '00000000-0000-0000-0001-000000000001', true)$$,
                 '42501', null, 'outsider cannot call admin_set_hidden');
select throws_ok('select public.delete_my_account()', '42501', null, 'outsider cannot call delete_my_account');
-- Read-only preview, so a new phone sees arzi before sign-in finishes
select is((select count(*) from public.public_feed('open')), 22::bigint, 'outsider preview shows the 22 open arzi, not the hidden one');
select is((select count(*) from public.public_feed('closed')), 0::bigint, 'nothing has closed yet');
select is((select count(*) from public.public_feed('anything else')), 0::bigint, 'unknown list name returns nothing');
select results_eq($$select approve_count, reject_count, vote_total, preview from public.public_feed()
                    where id = '00000000-0000-0000-0001-000000000002'$$,
                  $$values (0, 0, 1, true)$$, 'outsider sees how many voted on an open arzi, never which way');
select is((select count(*) from public.public_request('00000000-0000-0000-0002-000000000001')), 0::bigint,
          'outsider cannot open the hidden arzi by link');
select is((select count(*) from public.public_request('00000000-0000-0000-0001-000000000001')), 1::bigint,
          'outsider can open a visible arzi by link');
select throws_ok('select user_id from public.public_feed()', '42703', null, 'preview never includes user ids');
select throws_ok('select user_id from public.public_comments(''00000000-0000-0000-0001-000000000001'')', '42703', null,
                 'comment preview never includes user ids');
reset role;

-- Comments in the preview: visible ones only, and closed arzi show their result
insert into public.comments (id, request_id, user_id, body, hidden) values
  ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0001-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Battery badlo, phone theek hai', false),
  ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0001-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Hidden comment text', true);
update public.requests set closes_at = now() - interval '1 minute' where id = '00000000-0000-0000-0001-000000000002';
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select results_eq($$select body from public.public_comments('00000000-0000-0000-0001-000000000001')$$,
                  $$values ('Battery badlo, phone theek hai'::text)$$, 'outsider sees visible comments only');
select is((select comment_count from public.public_request('00000000-0000-0000-0001-000000000001')), 1,
          'hidden comments are not counted');
select results_eq($$select approve_count, reject_count, preview from public.public_feed('closed')$$,
                  $$values (1, 0, false)$$, 'once voting closes, the result is public');
reset role;
delete from public.comments where id in ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0003-000000000002');
update public.requests set closes_at = now() + interval '1 day' where id = '00000000-0000-0000-0001-000000000002';

-- ── 2. Guest (anonymous account) ──────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb","role":"authenticated","is_anonymous":true}', true);

select is((select count(*) from public.request_feed), 22::bigint, 'guest sees the 22 open arzi, not the hidden one');
select throws_ok('select email from auth.users', '42501', null, 'guest cannot read emails');
select throws_ok('select created_at from public.profiles', '42501', null, 'guest can only read name and id of profiles');
select throws_ok('select verdict_emailed_at from public.requests', '42501', null, 'guest cannot read internal arzi columns');
select is((select count(*) from public.votes), 0::bigint, 'guest cannot see other people''s votes');

select lives_ok($$insert into public.votes (request_id, user_id, verdict)
  values ('00000000-0000-0000-0001-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'approve')$$, 'guest can vote');
select results_eq($$select vote_yes, vote_no from public.requests where id = '00000000-0000-0000-0001-000000000001'$$,
                  $$values (1, 0)$$, 'vote total goes up');
select lives_ok($$insert into public.votes (request_id, user_id, verdict)
  values ('00000000-0000-0000-0001-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'reject')
  on conflict (request_id, user_id) do update set verdict = excluded.verdict$$, 'guest can change their vote');
select results_eq($$select vote_yes, vote_no from public.requests where id = '00000000-0000-0000-0001-000000000001'$$,
                  $$values (0, 1)$$, 'totals follow the changed vote');
select is((select count(*) from public.votes), 1::bigint, 'guest sees only their own vote');

select throws_ok($$insert into public.requests (user_id, item, price_inr, category, reason)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Guest item', 100, 'other', 'Trying without verifying')$$,
  '42501', null, 'guest cannot post an arzi');
select throws_ok($$insert into public.comments (request_id, user_id, body)
  values ('00000000-0000-0000-0001-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'hello')$$,
  '42501', null, 'guest cannot comment');

-- 20 free votes
select is(public.guest_votes_left(), 19, 'guest has 19 free votes left after 1 vote');
select lives_ok($$insert into public.votes (request_id, user_id, verdict)
  select ('00000000-0000-0000-0001-' || lpad(g::text, 12, '0'))::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'approve'
  from generate_series(2, 20) g$$, 'guest can cast votes 2 to 20');
select throws_like($$insert into public.votes (request_id, user_id, verdict)
  values ('00000000-0000-0000-0001-000000000021', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'approve')$$,
  '%GUEST_VOTE_LIMIT%', 'the 21st guest vote is blocked');
select lives_ok($$insert into public.votes (request_id, user_id, verdict)
  values ('00000000-0000-0000-0001-000000000005', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'reject')
  on conflict (request_id, user_id) do update set verdict = excluded.verdict$$, 'guest at the limit can still change a vote');
select is(public.guest_votes_left(), 0, 'guest has 0 free votes left');

select throws_like($$select public.admin_set_hidden('request', '00000000-0000-0000-0001-000000000001', true)$$,
                   '%NOT_ADMIN%', 'guest cannot hide arzi');
update public.requests set outcome = 'bought' where id = '00000000-0000-0000-0001-000000000001';
reset role;
select is((select outcome::text from public.requests where id = '00000000-0000-0000-0001-000000000001'), null::text,
          'guest cannot change someone else''s outcome');

-- ── 3. Verified user ──────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"cccccccc-cccc-cccc-cccc-cccccccccccc","role":"authenticated","is_anonymous":false}', true);

select is(public.guest_votes_left(), null::int, 'verified users have no vote limit');
select lives_ok($$insert into public.requests (user_id, item, price_inr, category, reason)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Running shoes', 4000, 'fashion', 'Old pair is completely torn now')$$,
  'verified user can post an arzi');
select throws_like(format($$insert into public.requests (user_id, item, price_inr, category, reason)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Something', 500, 'other', %L)$$, 'I really need this ' || :'bad_word' || ' thing'),
  '%ABUSE_BLOCKED%', 'abusive words are blocked');
select throws_like($$insert into public.requests (user_id, item, price_inr, category, reason)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Phone', 500, 'other', 'Call me on 98765 43210 for details')$$,
  '%CONTACT_BLOCKED%', 'phone numbers are blocked');
select throws_like($$insert into public.comments (request_id, user_id, body)
  values ('00000000-0000-0000-0001-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'mail me at someone@gmail.com')$$,
  '%CONTACT_BLOCKED%', 'emails in comments are blocked');
select throws_like($$insert into public.requests (user_id, item, price_inr, category, reason, link)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Gadget', 500, 'other', 'Saw it on some random site', 'https://evil.example.com/x')$$,
  '%LINK_NOT_ALLOWED%', 'links from non-shopping sites are blocked');
select lives_ok(format($$insert into public.requests (user_id, item, price_inr, category, reason, link)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Gadget', 500, 'other', 'Good reviews and on sale', %L)$$,
  'https://www.' || :'shop_domain' || '/p/123'), 'shopping site links are allowed');
select lives_ok($$insert into public.comments (request_id, user_id, body)
  values ('00000000-0000-0000-0001-000000000001', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Le lo, worth it')$$,
  'verified user can comment');
select throws_ok($$insert into public.votes (request_id, user_id, verdict)
  select id, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'approve' from public.requests
  where user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' limit 1$$, '42501', null, 'nobody can vote on their own arzi');
select lives_ok($$insert into public.requests (user_id, item, price_inr, category, reason)
  select 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Extra ' || g, 100, 'other', 'Filling up today''s quota'
  from generate_series(1, 3) g$$, 'arzi 3 to 5 of the day are allowed');
select throws_like($$insert into public.requests (user_id, item, price_inr, category, reason)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'One too many', 100, 'other', 'Sixth arzi of the day')$$,
  '%Daily limit%', 'the 6th arzi in a day is blocked');
select is((select count(*) from public.request_feed where id = '00000000-0000-0000-0002-000000000001'), 0::bigint,
          'verified users don''t see hidden arzi');
reset role;

-- ── 4. Admin ──────────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"dddddddd-dddd-dddd-dddd-dddddddddddd","role":"authenticated","is_anonymous":false}', true);
select is((select count(*) from public.request_feed where id = '00000000-0000-0000-0002-000000000001'), 1::bigint,
          'admin sees hidden arzi');
select lives_ok($$select public.admin_set_hidden('request', '00000000-0000-0000-0001-000000000003', true)$$,
                'admin can hide an arzi');
reset role;
select ok((select hidden from public.requests where id = '00000000-0000-0000-0001-000000000003'), 'the arzi is now hidden');

-- ── 5. Poster: own outcome, own account ───────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated","is_anonymous":false}', true);
select lives_ok($$update public.requests set outcome = 'skipped' where id = '00000000-0000-0000-0001-000000000001'$$,
                'poster can mark their own outcome');
select throws_ok($$update public.requests set item = 'Changed' where id = '00000000-0000-0000-0001-000000000001'$$,
                 '42501', null, 'poster cannot edit the arzi after posting');
select lives_ok('select public.delete_my_account()', 'poster can delete their account');
reset role;
select is((select count(*) from public.requests where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 0::bigint,
          'deleting the account removes their arzi');
select is((select count(*) from public.profiles where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), 1::bigint,
          'other people''s accounts are untouched');

select * from finish();
rollback;
