-- APPLIED 2026-11-17 as migration growth_features.
-- 1) Guests can vote (one vote per account). Posting and commenting still need a verified email.
drop policy if exists "verified users vote" on public.votes;
drop policy if exists "verified users change vote" on public.votes;

-- 2) Optional product link, limited to shopping sites in an editable allowlist
--    (Supabase → Table Editor → allowed_link_domains).
alter table public.requests add column if not exists link text
  check (link is null or (char_length(link) <= 500 and link ~* '^https?://[^\s]+$'));

create table if not exists public.allowed_link_domains (
  domain text primary key check (domain ~ '^[a-z0-9.-]+$')
);
alter table public.allowed_link_domains enable row level security; -- no policies: invisible to app users

create or replace function public.link_allowed(u text)
returns boolean language sql stable security definer set search_path = public as $$
  select u is null or exists (
    select 1
    from public.allowed_link_domains d
    cross join lateral (select lower(substring(u from '^https?://([^/:?#]+)')) as host) h
    where h.host = d.domain or h.host like '%.' || d.domain
  )
$$;
revoke execute on function public.link_allowed(text) from public, anon, authenticated;

create or replace function public.reject_abuse()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'requests' then
    if public.contains_abuse(concat_ws(' ', new.item, new.reason, new.alternative)) then
      raise exception 'ABUSE_BLOCKED';
    end if;
    if not public.link_allowed(new.link) then
      raise exception 'LINK_NOT_ALLOWED';
    end if;
  elsif tg_table_name = 'comments' then
    if public.contains_abuse(new.body) then
      raise exception 'ABUSE_BLOCKED';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists requests_abuse on public.requests;
create trigger requests_abuse before insert or update of item, reason, alternative, link on public.requests
  for each row execute function public.reject_abuse();

insert into public.allowed_link_domains (domain) values
  ('amazon.in'), ('amazon.com'), ('amzn.to'), ('amzn.in'), ('amzn.eu'),
  ('flipkart.com'), ('fkrt.it'), ('fkrt.co'), ('fkrt.cc'), ('shopsy.in'),
  ('myntra.com'), ('myntr.it'), ('ajio.com'), ('nykaa.com'), ('nykaafashion.com'), ('meesho.com'),
  ('snapdeal.com'), ('tatacliq.com'), ('croma.com'), ('reliancedigital.in'), ('vijaysales.com'), ('jiomart.com'),
  ('bigbasket.com'), ('blinkit.com'), ('zeptonow.com'), ('swiggy.com'), ('zomato.com'),
  ('apple.com'), ('samsung.com'), ('oneplus.in'), ('mi.com'), ('boat-lifestyle.com'), ('lenskart.com'),
  ('decathlon.in'), ('ikea.com'), ('pepperfry.com'), ('urbanladder.com'), ('firstcry.com'),
  ('nike.com'), ('adidas.co.in'), ('puma.com'), ('hm.com'), ('zara.com'), ('uniqlo.com'),
  ('makemytrip.com'), ('goibibo.com'), ('cleartrip.com'), ('irctc.co.in'), ('bookmyshow.com'), ('district.in')
on conflict do nothing;

-- 3) Track which closed requests already got their "verdict is in" email.
alter table public.requests add column if not exists verdict_emailed_at timestamptz;

-- 4) Feed view now includes the link (appended at the end).
create or replace view public.request_feed with (security_invoker = true) as
select
  r.id, r.user_id, r.item, r.price_inr, r.category, r.reason, r.alternative,
  r.closes_at, r.outcome, r.created_at,
  p.handle,
  (select count(*) from public.votes v where v.request_id = r.id and v.verdict = 'approve')::int as approve_count,
  (select count(*) from public.votes v where v.request_id = r.id and v.verdict = 'reject')::int  as reject_count,
  (select count(*) from public.comments c where c.request_id = r.id and not c.hidden)::int     as comment_count,
  (select v.verdict from public.votes v where v.request_id = r.id and v.user_id = auth.uid())   as my_vote,
  r.link
from public.requests r
join public.profiles p on p.id = r.user_id
where not r.hidden or r.user_id = auth.uid();

-- Verdict emails: Edge Function supabase/functions/verdict-emails, called every 15 minutes.
-- (Applied as migration schedule_verdict_emails; vault holds project_url and anon_jwt.)
-- select cron.schedule('verdict-emails-every-15-min', '*/15 * * * *', $$ select net.http_post(url, headers, body, timeout_milliseconds := 60000) $$);
