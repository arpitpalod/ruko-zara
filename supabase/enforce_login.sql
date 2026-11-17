-- APPLIED 2026-11-17 as migration enforce_verified_login_for_writes.
-- The database itself refuses votes, requests and comments from accounts without a verified email.
drop policy if exists "verified users write requests" on public.requests;
create policy "verified users write requests" on public.requests as restrictive for insert to authenticated
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
drop policy if exists "verified users vote" on public.votes;
create policy "verified users vote" on public.votes as restrictive for insert to authenticated
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
drop policy if exists "verified users change vote" on public.votes;
create policy "verified users change vote" on public.votes as restrictive for update to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
drop policy if exists "verified users comment" on public.comments;
create policy "verified users comment" on public.comments as restrictive for insert to authenticated
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
