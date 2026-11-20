-- Instagram publisher: every 15 minutes, off the hour marks (:05 :20 :35 :50) so it doesn't run
-- together with the results emails. Uses the same Vault secrets as the other jobs: project_url, anon_jwt.
-- Stop: select cron.unschedule('ig-publish');
select cron.schedule('ig-publish', '5,20,35,50 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/ig-publish',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anon_jwt')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$$);
