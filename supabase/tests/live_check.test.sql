-- The hourly live check reports through live_check_report: only the server can call it, and an
-- email is queued only when the state changes.
\set ON_ERROR_STOP on
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select * from no_plan();

alter table private.alerts disable trigger alerts_wake_sender;  -- no real emails from tests
delete from private.alerts;
update private.live_check_state set failing = '{}', since = null;

-- Nobody but the server can report
set local role anon;
select throws_ok($$select public.live_check_report(array['x'])$$, '42501', null, 'outsiders cannot report');
reset role;
set local role authenticated;
select throws_ok($$select public.live_check_report(array['x'])$$, '42501', null, 'signed-in people cannot report');
reset role;
set local role anon;
select throws_ok($$select * from private.live_check_state$$, '42501', null, 'the check state is private');
reset role;

set local role service_role;
select is(public.live_check_report('{}'), 'ok', 'all fine: nothing sent');
select is(public.live_check_report(array['Website is down']), 'alerted', 'a new problem sends an email');
select is(public.live_check_report(array['Website is down']), 'still failing', 'the same problem again sends nothing');
select is(public.live_check_report(array['Website is down', 'Bot check is off']), 'alerted', 'a different problem sends an email');
select is(public.live_check_report('{}'), 'resolved', 'fixed: sends the all-clear');
select is(public.live_check_report('{}'), 'ok', 'still fine: nothing sent');
reset role;

select is((select count(*) from private.alerts), 3::bigint, 'exactly three emails queued');
select results_eq($$select subject from private.alerts order by id$$,
  $$values ('🚨 Live check failed'::text), ('🚨 Live check failed'), ('✅ Resolved: live check passes again')$$,
  'failed, failed (changed), resolved');
select ok((select body from private.alerts order by id desc limit 1) like '%Bot check is off%', 'the all-clear lists what was wrong');

select * from finish();
rollback;
