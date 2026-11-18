-- Vote speed limit and verified vote counts (Reddit feedback, 18 Nov).
-- People: P = poster   G = guest   V = verified voter   S = guest who verifies later
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

insert into auth.users (id, aud, role, email, is_anonymous) values
  ('33333333-3333-4333-8333-000000000001', 'authenticated', 'authenticated', 'p3@example.com', false),
  ('33333333-3333-4333-8333-000000000002', 'authenticated', 'authenticated', null, true),
  ('33333333-3333-4333-8333-000000000003', 'authenticated', 'authenticated', 'v3@example.com', false),
  ('33333333-3333-4333-8333-000000000004', 'authenticated', 'authenticated', null, true);
alter table public.requests disable trigger requests_rate_limit;  -- setup only: 12 arzi by one person
insert into public.requests (id, user_id, item, price_inr, category, reason)
  select ('44444444-4444-4444-8444-' || lpad(g::text, 12, '0'))::uuid, '33333333-3333-4333-8333-000000000001',
         'Speed item ' || g, 1000 + g, 'other', 'Need it for a proper test'
  from generate_series(1, 12) g;
alter table public.requests enable trigger requests_rate_limit;

-- ── Speed limit ──────────────────────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-000000000003","role":"authenticated","is_anonymous":false}', true);
select lives_ok($$insert into public.votes (request_id, user_id, verdict)
  select ('44444444-4444-4444-8444-' || lpad(g::text, 12, '0'))::uuid, '33333333-3333-4333-8333-000000000003', 'approve'
  from generate_series(1, 10) g$$, '10 new votes in a minute are fine');
select throws_ok($$insert into public.votes (request_id, user_id, verdict) values
  ('44444444-4444-4444-8444-000000000011', '33333333-3333-4333-8333-000000000003', 'approve')$$,
  'P0001', 'VOTE_TOO_FAST', 'the 11th new vote within a minute is refused');
select lives_ok($$insert into public.votes (request_id, user_id, verdict) values
  ('44444444-4444-4444-8444-000000000001', '33333333-3333-4333-8333-000000000003', 'reject')
  on conflict (request_id, user_id) do update set verdict = excluded.verdict$$,
  'changing an existing vote is still allowed');
reset role;
update public.votes set created_at = now() - interval '2 minutes' where user_id = '33333333-3333-4333-8333-000000000003';
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-000000000003","role":"authenticated","is_anonymous":false}', true);
select lives_ok($$insert into public.votes (request_id, user_id, verdict) values
  ('44444444-4444-4444-8444-000000000011', '33333333-3333-4333-8333-000000000003', 'approve')$$,
  'a minute later, voting works again');
reset role;

-- ── Verified counts ──────────────────────────────────────────────────────────
-- On arzi 12: V says buy, G says skip, S (guest) says skip
insert into public.votes (request_id, user_id, verdict) values
  ('44444444-4444-4444-8444-000000000012', '33333333-3333-4333-8333-000000000003', 'approve'),
  ('44444444-4444-4444-8444-000000000012', '33333333-3333-4333-8333-000000000002', 'reject'),
  ('44444444-4444-4444-8444-000000000012', '33333333-3333-4333-8333-000000000004', 'reject');
select results_eq($$select vote_yes, vote_no, verified_yes, verified_no from public.requests
                    where id = '44444444-4444-4444-8444-000000000012'$$,
                  $$values (1, 2, 1, 0)$$, 'totals count everyone; verified counts only verified accounts');
update auth.users set is_anonymous = false, email = 's3@example.com' where id = '33333333-3333-4333-8333-000000000004';
select results_eq($$select verified_yes, verified_no from public.requests where id = '44444444-4444-4444-8444-000000000012'$$,
                  $$values (1, 1)$$, 'a guest who verifies: their earlier vote now counts as verified');

-- the feed shows them to signed-in people
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-000000000002","role":"authenticated","is_anonymous":true}', true);
select results_eq($$select approve_count, reject_count, verified_approve, verified_reject from public.request_feed
                    where id = '44444444-4444-4444-8444-000000000012'$$,
                  $$values (1, 2, 1, 1)$$, 'the feed carries verified counts');
reset role;

-- nobody can write the counts themselves
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-000000000001","role":"authenticated","is_anonymous":false}', true);
select throws_ok($$update public.requests set verified_yes = 99 where id = '44444444-4444-4444-8444-000000000012'$$,
                 '42501', null, 'the poster cannot set verified counts');
reset role;

-- outsiders see verified counts only once voting has closed
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select results_eq($$select verified_approve, verified_reject from public.public_request('44444444-4444-4444-8444-000000000012')$$,
                  $$values (0, 0)$$, 'preview hides verified counts while voting is open');
reset role;
update public.requests set closes_at = now() - interval '1 minute' where id = '44444444-4444-4444-8444-000000000012';
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select results_eq($$select verified_approve, verified_reject from public.public_request('44444444-4444-4444-8444-000000000012')$$,
                  $$values (1, 1)$$, 'preview shows verified counts once voting has closed');
select throws_ok($$select private.recount_votes('44444444-4444-4444-8444-000000000012')$$, '42501', null, 'outsiders cannot recount');
reset role;

select * from finish();
rollback;
