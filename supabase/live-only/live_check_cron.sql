-- Set up on the live database only (pg_cron + pg_net aren't in the test copy). Applied 18 Nov.
-- Runs the Edge Function `live-check` every hour at :17 UTC (:47 IST). It checks the app from the
-- outside and calls public.live_check_report, which emails the owner when something changes.
-- Uses the same Vault secrets as the verdict-email job: project_url and anon_jwt.
select cron.schedule('live-check-hourly', '17 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/live-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_jwt')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
-- To stop it: select cron.unschedule('live-check-hourly');
