-- Vote reasons (18 Nov): one reason per vote from a fixed list, tallied for the poster.
-- People: P = poster  A, B, N = voters  X = voter who gets banned  K = voter on an older app  C = never votes
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('55555555-5555-4555-8555-000000000001', 'authenticated', 'authenticated', 'p5@example.com', false),
  ('55555555-5555-4555-8555-000000000002', 'authenticated', 'authenticated', 'a5@example.com', false),
  ('55555555-5555-4555-8555-000000000003', 'authenticated', 'authenticated', 'b5@example.com', false),
  ('55555555-5555-4555-8555-000000000004', 'authenticated', 'authenticated', 'c5@example.com', false),
  ('55555555-5555-4555-8555-000000000005', 'authenticated', 'authenticated', 'x5@example.com', false),
  ('55555555-5555-4555-8555-000000000006', 'authenticated', 'authenticated', 'k5@example.com', false),
  ('55555555-5555-4555-8555-000000000007', 'authenticated', 'authenticated', 'n5@example.com', false);
insert into public.requests (id, user_id, item, price_inr, category, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000001',
   'Reason test item', 4999, 'other', 'Need it for a proper test');

\set P '{"sub":"55555555-5555-4555-8555-000000000001","role":"authenticated","is_anonymous":false}'
\set A '{"sub":"55555555-5555-4555-8555-000000000002","role":"authenticated","is_anonymous":false}'
\set B '{"sub":"55555555-5555-4555-8555-000000000003","role":"authenticated","is_anonymous":false}'
\set C '{"sub":"55555555-5555-4555-8555-000000000004","role":"authenticated","is_anonymous":false}'
\set X '{"sub":"55555555-5555-4555-8555-000000000005","role":"authenticated","is_anonymous":false}'
\set K '{"sub":"55555555-5555-4555-8555-000000000006","role":"authenticated","is_anonymous":false}'
\set N '{"sub":"55555555-5555-4555-8555-000000000007","role":"authenticated","is_anonymous":false}'
\set tally 'select reason, n from public.vote_reasons(''66666666-6666-4666-8666-000000000001'') order by reason'

-- ── Saving a reason ──────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', :'A', true);
select lives_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000002', 'approve', 'need_it')$$,
  'a Buy it vote saves a Buy it reason');
select set_config('request.jwt.claims', :'B', true);
select throws_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000003', 'reject', 'need_it')$$,
  '23514', null, 'a Skip it vote cannot carry a Buy it reason');
select lives_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000003', 'reject', 'wait_sale')$$,
  'a Skip it vote saves a Skip it reason');
select set_config('request.jwt.claims', :'X', true);
select throws_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000005', 'approve', 'my own words')$$,
  '23514', null, 'free text is not a reason');
select lives_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000005', 'approve', 'worth_price')$$,
  'X votes Buy it: worth the price');
select set_config('request.jwt.claims', :'N', true);
select lives_ok($$insert into public.votes (request_id, user_id, verdict) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000007', 'approve')$$,
  'a vote with no reason still works (older apps)');

-- An older app changes its vote and sends no reason: the vote changes, the old reason goes.
select set_config('request.jwt.claims', :'K', true);
select lives_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000006', 'approve', 'treat_yourself')$$,
  'K votes Buy it: treat yourself');
select lives_ok($$insert into public.votes (request_id, user_id, verdict) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000006', 'reject')
  on conflict (request_id, user_id) do update set verdict = excluded.verdict$$,
  'an older app can still change a vote');
select is((select reason from public.votes where user_id = '55555555-5555-4555-8555-000000000006'), null,
  'and the Buy it reason does not stick to a Skip it vote');

-- The new app changes vote and reason together.
select set_config('request.jwt.claims', :'B', true);
select lives_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000003', 'approve', 'worth_price')
  on conflict (request_id, user_id) do update set verdict = excluded.verdict, reason = excluded.reason$$,
  'changing vote and reason together works');
select lives_ok($$insert into public.votes (request_id, user_id, verdict, reason) values
  ('66666666-6666-4666-8666-000000000001', '55555555-5555-4555-8555-000000000003', 'reject', 'wait_sale')
  on conflict (request_id, user_id) do update set verdict = excluded.verdict, reason = excluded.reason$$,
  'and back again');
select is((select reason from public.votes where user_id = '55555555-5555-4555-8555-000000000003'), 'wait_sale',
  'the new reason is kept');
reset role;

-- X gets banned. Votes now: A buy/need_it · B skip/wait_sale · X buy/worth_price (banned) · K skip/none · N buy/none
insert into private.banned_users (user_id, reason) values ('55555555-5555-4555-8555-000000000005', 'test');

-- ── Who sees the tally (same rules as the vote split) ────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', :'C', true);
select is((select count(*) from public.vote_reasons('66666666-6666-4666-8666-000000000001')), 0::bigint,
  'someone who has not voted sees no reasons while voting is open');
select set_config('request.jwt.claims', :'A', true);
select results_eq(:'tally',
  $$values ('need_it'::text, 1), ('wait_sale', 1)$$,
  'a voter sees the tally, without the banned voter''s reason and without blanks');
select set_config('request.jwt.claims', :'P', true);
select results_eq(:'tally',
  $$values ('need_it'::text, 1), ('wait_sale', 1)$$, 'the poster sees the tally');
select set_config('request.jwt.claims', :'X', true);
select results_eq(:'tally',
  $$values ('need_it'::text, 1), ('wait_sale', 1), ('worth_price', 1)$$,
  'the banned voter still sees their own reason (nothing looks different to them)');
select is((select count(*) from public.votes where user_id <> '55555555-5555-4555-8555-000000000005'), 0::bigint,
  'other people''s reasons stay private row by row');
reset role;

set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$select * from public.vote_reasons('66666666-6666-4666-8666-000000000001')$$,
  '42501', null, 'people not signed in cannot read reasons');
reset role;

update public.requests set closes_at = now() - interval '1 minute' where id = '66666666-6666-4666-8666-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', :'C', true);
select results_eq(:'tally',
  $$values ('need_it'::text, 1), ('wait_sale', 1)$$, 'once voting closes, anyone signed in sees the tally');
reset role;

insert into public.blocks (blocker_id, blocked_id) values
  ('55555555-5555-4555-8555-000000000004', '55555555-5555-4555-8555-000000000001');
set local role authenticated;
select set_config('request.jwt.claims', :'C', true);
select is((select count(*) from public.vote_reasons('66666666-6666-4666-8666-000000000001')), 0::bigint,
  'someone who blocked the poster sees nothing');
reset role;

update public.requests set hidden = true where id = '66666666-6666-4666-8666-000000000001';
set local role authenticated;
select set_config('request.jwt.claims', :'A', true);
select is((select count(*) from public.vote_reasons('66666666-6666-4666-8666-000000000001')), 0::bigint,
  'a hidden arzi shows its reasons to no voter');
select set_config('request.jwt.claims', :'P', true);
select results_eq(:'tally',
  $$values ('need_it'::text, 1), ('wait_sale', 1)$$, 'but its poster still sees them');
reset role;

select * from finish();
rollback;
