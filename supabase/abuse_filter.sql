-- APPLIED 2026-11-17 as migration abuse_filter.
-- Abuse filter: posts and comments containing a blocked word are rejected by the database.
-- Edit the word list any time in Supabase → Table Editor → blocked_words (no app update needed).

create table if not exists public.blocked_words (
  word text primary key check (char_length(word) between 2 and 40)
);
alter table public.blocked_words enable row level security; -- no policies: invisible to app users

-- lowercase, strip punctuation, drop Devanagari nukta, collapse repeated latin letters ("fuuuck" → "fuck")
create or replace function public.normalize_text(t text)
returns text language sql immutable set search_path = pg_catalog as $$
  select regexp_replace(
           regexp_replace(
             translate(replace(lower(coalesce(t, '')), E'़', ''), E'ड़ढ़', E'डढ'),
             E'[^a-z0-9ऀ-ॿ]+', ' ', 'g'),
           '([a-z])\1+', '\1', 'g')
$$;

create or replace function public.contains_abuse(t text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocked_words w
    where position(' ' || public.normalize_text(w.word) || ' ' in ' ' || public.normalize_text(t) || ' ') > 0
  )
$$;

create or replace function public.reject_abuse()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'requests' then
    if public.contains_abuse(concat_ws(' ', new.item, new.reason, new.alternative)) then
      raise exception 'ABUSE_BLOCKED';
    end if;
  elsif tg_table_name = 'comments' then
    if public.contains_abuse(new.body) then
      raise exception 'ABUSE_BLOCKED';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists requests_abuse on public.requests;
create trigger requests_abuse before insert or update of item, reason, alternative on public.requests
  for each row execute function public.reject_abuse();
drop trigger if exists comments_abuse on public.comments;
create trigger comments_abuse before insert on public.comments
  for each row execute function public.reject_abuse();

revoke execute on function public.contains_abuse(text) from public, anon, authenticated;
revoke execute on function public.reject_abuse() from public, anon, authenticated;

-- Starter list: common English, Hinglish and Hindi abuse. Add or remove rows freely.
insert into public.blocked_words (word) values
  ('fuck'), ('fucker'), ('fucking'), ('motherfucker'), ('bitch'), ('bastard'), ('asshole'), ('cunt'),
  ('dick'), ('slut'), ('whore'), ('retard'),
  ('madarchod'), ('madarchodo'), ('maderchod'), ('mc'), ('mkc'), ('tmkc'),
  ('bhenchod'), ('behenchod'), ('bhainchod'), ('bc'), ('bkl'), ('bsdk'),
  ('chutiya'), ('chutiye'), ('chutia'), ('chutiyapa'), ('chut'), ('choot'), ('chodu'),
  ('gandu'), ('gaand'), ('lund'), ('loda'), ('lauda'), ('lavda'), ('lodu'),
  ('randi'), ('randwa'), ('harami'), ('haramkhor'), ('bhosdike'), ('bhosdi'), ('bhosda'),
  ('kutiya'), ('chinal'), ('jhatu'), ('jhaant'),
  ('मादरचोद'), ('भेनचोद'), ('बहनचोद'), ('चूतिया'), ('चुतिया'), ('चूत'), ('गांडू'), ('गाण्डू'), ('गांड'),
  ('लंड'), ('लौडा'), ('लौड़ा'), ('रंडी'), ('हरामी'), ('हरामखोर'), ('भोसडीके'), ('भोसड़ीके'), ('कुतिया'), ('चिनाल'), ('झाटू')
on conflict do nothing;
