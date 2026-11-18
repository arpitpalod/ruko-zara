-- Applied to the test copy after the live public schema: things that live outside "public"
-- in the live database but that the app depends on.

-- Every new login gets a profile with a random name (live: trigger on auth.users).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A guest who verifies their email: their earlier votes count as verified (live: trigger on auth.users, 18 Nov).
drop trigger if exists recount_votes_on_verify on auth.users;
create trigger recount_votes_on_verify after update of is_anonymous on auth.users
  for each row when (old.is_anonymous and not new.is_anonymous)
  execute function private.recount_after_verify();
