-- Silent ban: a banned person sees nothing unusual, but nothing they do reaches anyone else.
-- People:  P = poster   B = person who gets banned   V = viewer   W = another viewer   M = admin
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('11111111-1111-4111-8111-000000000001', 'authenticated', 'authenticated', 'p@example.com', false),
  ('11111111-1111-4111-8111-000000000002', 'authenticated', 'authenticated', 'b@example.com', false),
  ('11111111-1111-4111-8111-000000000003', 'authenticated', 'authenticated', 'v@example.com', false),
  ('11111111-1111-4111-8111-000000000004', 'authenticated', 'authenticated', 'w@example.com', false),
  ('11111111-1111-4111-8111-000000000005', 'authenticated', 'authenticated', 'm@example.com', false);
insert into public.admins (user_id) values ('11111111-1111-4111-8111-000000000005');
insert into public.requests (id, user_id, item, price_inr, category, reason) values
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000001', 'Normal arzi', 1000, 'other', 'A normal honest request'),
  ('22222222-2222-4222-8222-000000000002', '11111111-1111-4111-8111-000000000002', 'Spam arzi', 1000, 'other', 'Spam from the soon banned');
insert into public.votes (request_id, user_id, verdict) values
  ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000002', 'approve');
-- the admin had also blocked B personally (this used to hide B from moderation)
insert into public.blocks (blocker_id, blocked_id) values
  ('11111111-1111-4111-8111-000000000005', '11111111-1111-4111-8111-000000000002');

-- Only admins can ban
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-000000000003","role":"authenticated","is_anonymous":false}', true);
select throws_like($$select public.admin_set_banned('11111111-1111-4111-8111-000000000002', true)$$, '%NOT_ADMIN%', 'non-admins cannot ban');
select is((select count(*) from public.admin_banned_ids()), 0::bigint, 'non-admins cannot see who is banned');
select throws_ok('select count(*) from private.banned_users', '42501', null, 'nobody can read the ban list directly');
reset role;
set local role anon;
select throws_ok($$select public.admin_set_banned('11111111-1111-4111-8111-000000000002', true)$$, '42501', null, 'outsiders cannot ban');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-000000000005","role":"authenticated","is_anonymous":false}', true);
select throws_like($$select public.admin_set_banned('11111111-1111-4111-8111-000000000005', true)$$, '%CANNOT_BAN_ADMIN%', 'admins cannot be banned');
select lives_ok($$select public.admin_set_banned('11111111-1111-4111-8111-000000000002', true, 'spam')$$, 'admin bans B');
select is((select count(*) from public.admin_banned_ids() x where x = '11111111-1111-4111-8111-000000000002'), 1::bigint, 'admin sees B on the ban list');
select is((select count(*) from public.request_feed where id = '22222222-2222-4222-8222-000000000002'), 1::bigint, 'admin still sees B''s arzi');
reset role;
select is((select count(*) from public.blocks where blocked_id = '11111111-1111-4111-8111-000000000002'), 0::bigint,
          'the admin''s personal block is removed so B stays visible to moderation');

-- Everyone else
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-000000000003","role":"authenticated","is_anonymous":false}', true);
select is((select count(*) from public.request_feed where id = '22222222-2222-4222-8222-000000000002'), 0::bigint, 'others don''t see B''s arzi');
select is((select approve_count from public.request_feed where id = '22222222-2222-4222-8222-000000000001'), 0, 'B''s vote doesn''t count for others');
reset role;

-- B: everything looks normal
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-000000000002","role":"authenticated","is_anonymous":false}', true);
select is((select count(*) from public.request_feed where id = '22222222-2222-4222-8222-000000000002'), 1::bigint, 'B still sees their own arzi');
select results_eq($$select approve_count, my_vote::text from public.request_feed where id = '22222222-2222-4222-8222-000000000001'$$,
                  $$values (1, 'approve')$$, 'B sees their own vote counted');
select lives_ok($$insert into public.requests (user_id, item, price_inr, category, reason)
  values ('11111111-1111-4111-8111-000000000002', 'More spam', 100, 'other', 'Posting while banned')$$, 'B can still post (no error)');
select lives_ok($$insert into public.comments (request_id, user_id, body)
  values ('22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000002', 'buy it bro')$$, 'B can still comment (no error)');
select is((select count(*) from public.comments where request_id = '22222222-2222-4222-8222-000000000001'), 1::bigint, 'B sees their own comment');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-000000000003","role":"authenticated","is_anonymous":false}', true);
select is((select count(*) from public.request_feed where user_id = '11111111-1111-4111-8111-000000000002'), 0::bigint, 'others don''t see B''s new arzi');
select is((select count(*) from public.comments where request_id = '22222222-2222-4222-8222-000000000001'), 0::bigint, 'others don''t see B''s comment');
select is((select comment_count from public.request_feed where id = '22222222-2222-4222-8222-000000000001'), 0, 'B''s comment isn''t counted for others');
select is((select count(*) from public.profiles where id = '11111111-1111-4111-8111-000000000002'), 0::bigint, 'others can''t even see B''s profile');
reset role;

-- Outsiders (not signed in yet) see the same as everyone else: nothing from B
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select is((select count(*) from public.public_feed() where item in ('Spam arzi', 'More spam')), 0::bigint, 'outsiders don''t see B''s arzi');
select is((select count(*) from public.public_request('22222222-2222-4222-8222-000000000002')), 0::bigint, 'outsiders can''t open B''s arzi by link');
select is((select count(*) from public.public_comments('22222222-2222-4222-8222-000000000001')), 0::bigint, 'outsiders don''t see B''s comment');
select results_eq($$select comment_count, vote_total from public.public_request('22222222-2222-4222-8222-000000000001')$$,
                  $$values (0, 0)$$, 'B''s comment and vote aren''t counted for outsiders');
reset role;

-- Reports from B don't count towards auto-hiding
insert into public.reports (target_type, target_id, user_id) values
  ('request', '22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000003'),
  ('request', '22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000004'),
  ('request', '22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000002');
select ok(not (select hidden from public.requests where id = '22222222-2222-4222-8222-000000000001'), 'a banned person''s report doesn''t count');
insert into public.reports (target_type, target_id, user_id) values
  ('request', '22222222-2222-4222-8222-000000000001', '11111111-1111-4111-8111-000000000005');
select ok((select hidden from public.requests where id = '22222222-2222-4222-8222-000000000001'), 'three real reports still hide an arzi');
update public.requests set hidden = false where id = '22222222-2222-4222-8222-000000000001';

-- Unban restores everything
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-000000000005","role":"authenticated","is_anonymous":false}', true);
select lives_ok($$select public.admin_set_banned('11111111-1111-4111-8111-000000000002', false)$$, 'admin unbans B');
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-000000000003","role":"authenticated","is_anonymous":false}', true);
select is((select count(*) from public.request_feed where id = '22222222-2222-4222-8222-000000000002'), 1::bigint, 'after unban others see B''s arzi again');
select is((select approve_count from public.request_feed where id = '22222222-2222-4222-8222-000000000001'), 1, 'after unban B''s vote counts again');
reset role;

-- Abuse filter: slurs inside longer words, without blocking innocent words
select ok(public.contains_abuse('Randikhana’s Deepali'), 'slur at the start of a longer word is blocked');
select ok(not public.contains_abuse('grandiose plans'), 'grandiose is fine');
select ok(not public.contains_abuse('chutney maker'), 'chutney is fine');
select ok(not public.contains_abuse('Gandhi jayanti sale'), 'Gandhi is fine');
select ok(not public.contains_abuse('Kutiyana trip'), 'Kutiyana is fine');
select ok(not public.contains_abuse('Dickens novels'), 'Dickens is fine');
-- Sexual content (18 Nov)
select ok(public.contains_abuse('Sex Doll 10000'), 'sexual items are blocked');
select ok(public.contains_abuse('I am horny, should I buy or fap it out?'), 'sexual reasons are blocked');
select ok(not public.contains_abuse('Unisex hoodie'), 'unisex is fine');
select ok(not public.contains_abuse('nude lipstick shade'), 'nude (a colour) is fine');
select ok(not public.contains_abuse('chodo yaar, mat lo'), 'chodo (leave it) is fine');

select * from finish();
rollback;
