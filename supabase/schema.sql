-- Ruko Zara — Supabase schema
-- Applied to project ehptarxgjmtbrxerwxim (ruko-zara, Mumbai) on 2026-11-16 as migration ruko_zara_initial_schema.
-- Also enable: Authentication → Sign In / Providers → "Allow anonymous sign-ins".


-- ───────────── Types ─────────────
do $$ begin
  create type public.verdict as enum ('approve', 'reject');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.outcome as enum ('bought', 'skipped');
exception when duplicate_object then null; end $$;

-- ───────────── Tables ─────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  handle      text not null unique check (char_length(handle) between 3 and 30),
  created_at  timestamptz not null default now()
);

create table if not exists public.requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  item         text not null check (char_length(item) between 2 and 80),
  price_inr    integer not null check (price_inr between 1 and 10000000),
  category     text not null check (char_length(category) <= 30),
  reason       text not null check (char_length(reason) between 10 and 500),
  alternative  text check (char_length(alternative) <= 200),
  closes_at    timestamptz not null default now() + interval '24 hours',
  outcome      public.outcome,
  hidden       boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists requests_created_idx on public.requests (created_at desc);
create index if not exists requests_user_idx on public.requests (user_id);

create table if not exists public.votes (
  request_id  uuid not null references public.requests on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  verdict     public.verdict not null,
  created_at  timestamptz not null default now(),
  primary key (request_id, user_id)
);

create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  body        text not null check (char_length(body) between 1 and 300),
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists comments_request_idx on public.comments (request_id, created_at);

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  text not null check (target_type in ('request', 'comment')),
  target_id    uuid not null,
  user_id      uuid not null references public.profiles on delete cascade,
  reason       text check (char_length(reason) <= 200),
  created_at   timestamptz not null default now(),
  unique (target_type, target_id, user_id)
);

-- Users can block others: blocked users' requests and comments disappear for the blocker
create table if not exists public.blocks (
  blocker_id  uuid not null references public.profiles on delete cascade,
  blocked_id  uuid not null references public.profiles on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ───────────── Auto-create a fun handle on signup ─────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  adj  text[] := array['Kanjoos','Bachat','Sasta','Samajhdar','Thrifty','Chillar','Hisaabi','Sabar'];
  noun text[] := array['Kabootar','Baba','Tota','Bhalu','Chacha','Mausi','Tiger','Panda'];
  h text;
begin
  loop
    h := adj[1 + floor(random()*array_length(adj,1))::int] || ' '
      || noun[1 + floor(random()*array_length(noun,1))::int] || ' '
      || (10 + floor(random()*990))::int;
    exit when not exists (select 1 from public.profiles where handle = h);
  end loop;
  insert into public.profiles (id, handle) values (new.id, h);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Anti-spam: max 5 requests per user per day ─────────────
create or replace function public.limit_requests()
returns trigger language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.requests
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Daily limit reached: 5 arzi per day';
  end if;
  return new;
end $$;

drop trigger if exists requests_rate_limit on public.requests;
create trigger requests_rate_limit before insert on public.requests
  for each row execute function public.limit_requests();

-- ───────────── Moderation: auto-hide after 3 reports ─────────────
create or replace function public.auto_hide()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.reports
      where target_type = new.target_type and target_id = new.target_id) >= 3 then
    if new.target_type = 'request' then
      update public.requests set hidden = true where id = new.target_id;
    else
      update public.comments set hidden = true where id = new.target_id;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists reports_auto_hide on public.reports;
create trigger reports_auto_hide after insert on public.reports
  for each row execute function public.auto_hide();

-- ───────────── Feed view (counts + my vote) ─────────────
create or replace view public.request_feed with (security_invoker = true) as
select
  r.id, r.user_id, r.item, r.price_inr, r.category, r.reason, r.alternative,
  r.closes_at, r.outcome, r.created_at,
  p.handle,
  (select count(*) from public.votes v where v.request_id = r.id and v.verdict = 'approve')::int as approve_count,
  (select count(*) from public.votes v where v.request_id = r.id and v.verdict = 'reject')::int  as reject_count,
  (select count(*) from public.comments c where c.request_id = r.id and not c.hidden)::int     as comment_count,
  (select v.verdict from public.votes v where v.request_id = r.id and v.user_id = auth.uid())   as my_vote
from public.requests r
join public.profiles p on p.id = r.user_id
where not r.hidden or r.user_id = auth.uid();

-- ───────────── Row Level Security ─────────────
alter table public.profiles enable row level security;
alter table public.requests enable row level security;
alter table public.votes    enable row level security;
alter table public.comments enable row level security;
alter table public.reports  enable row level security;
alter table public.blocks   enable row level security;

-- profiles
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated using (true);

-- requests
drop policy if exists "requests read" on public.requests;
create policy "requests read" on public.requests for select to authenticated
  using ((not hidden or user_id = auth.uid()) and not exists (
    select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = requests.user_id));
drop policy if exists "requests insert own" on public.requests;
create policy "requests insert own" on public.requests for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "requests update own" on public.requests;
create policy "requests update own" on public.requests for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- owners may only change the outcome column
revoke update on public.requests from authenticated;
grant update (outcome) on public.requests to authenticated;

-- votes: only on others' open requests, one per person (PK), changeable until close
drop policy if exists "votes read" on public.votes;
create policy "votes read" on public.votes for select to authenticated using (true);
drop policy if exists "votes insert" on public.votes;
create policy "votes insert" on public.votes for insert to authenticated
  with check (
    user_id = auth.uid() and exists (
      select 1 from public.requests r
      where r.id = request_id and r.user_id <> auth.uid() and r.closes_at > now() and not r.hidden)
  );
drop policy if exists "votes update" on public.votes;
create policy "votes update" on public.votes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.requests r where r.id = request_id and r.closes_at > now()));

-- comments
drop policy if exists "comments read" on public.comments;
create policy "comments read" on public.comments for select to authenticated
  using ((not hidden or user_id = auth.uid()) and not exists (
    select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = comments.user_id));
drop policy if exists "comments insert" on public.comments;
create policy "comments insert" on public.comments for insert to authenticated
  with check (user_id = auth.uid());

-- reports: write-only for users
drop policy if exists "reports insert" on public.reports;
create policy "reports insert" on public.reports for insert to authenticated
  with check (user_id = auth.uid());

-- blocks: you only see and manage your own block list
drop policy if exists "blocks own" on public.blocks;
create policy "blocks own" on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

grant select on public.request_feed to authenticated;

-- trigger-only functions: nobody should call these directly through the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.auto_hide()       from public, anon, authenticated;
revoke execute on function public.limit_requests()  from public, anon, authenticated;

-- ───────────── Account deletion (store requirement) ─────────────
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
