-- Applied to the test copy after the live public schema: things that live outside "public"
-- in the live database but that the app depends on.

-- Every new login gets a profile with a random name (live: trigger on auth.users).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
