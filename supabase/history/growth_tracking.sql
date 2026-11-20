-- Growth tracking (20 Nov 2026)
-- 1. Where each person first came from (?src=… on the link they opened), to see which channel works.
-- 2. The poster's OK to feature their arzi on Ruko Zara's social pages (name hidden). Off unless ticked.

-- ── 1. First-touch source ────────────────────────────────────────────────────
-- Kept on the profile; clients can't read it (profile columns are granted one by one: id, handle).
alter table public.profiles add column if not exists source text;
alter table public.profiles drop constraint if exists profiles_source_check;
alter table public.profiles add constraint profiles_source_check
  check (source is null or source ~ '^[a-z0-9-]{2,32}$');

-- Set once: later links never overwrite the first one. Anything that isn't a short code is ignored.
create or replace function public.set_source(src text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set source = lower(src)
   where id = auth.uid()
     and source is null
     and lower(src) ~ '^[a-z0-9-]{2,32}$';
$$;
revoke all on function public.set_source(text) from public, anon;
grant execute on function public.set_source(text) to authenticated;

-- ── 2. OK to feature ─────────────────────────────────────────────────────────
alter table public.requests add column if not exists feature_ok boolean not null default false;
grant select (feature_ok), insert (feature_ok), update (feature_ok) on public.requests to authenticated;

-- The feed view gains the column at the end (Postgres only allows appending); the rest is unchanged.
create or replace view public.request_feed
with (security_invoker = true)
as
 SELECT r.id,
    r.user_id,
    r.item,
    r.price_inr,
    r.category,
    r.reason,
    r.alternative,
    r.closes_at,
    r.outcome,
    r.created_at,
    p.handle,
    r.vote_yes +
        CASE
            WHEN mv.verdict = 'approve'::verdict AND mv.self_banned THEN 1
            ELSE 0
        END AS approve_count,
    r.vote_no +
        CASE
            WHEN mv.verdict = 'reject'::verdict AND mv.self_banned THEN 1
            ELSE 0
        END AS reject_count,
    (( SELECT count(*) AS count
           FROM comments c
          WHERE c.request_id = r.id AND NOT c.hidden))::integer AS comment_count,
    mv.verdict AS my_vote,
    r.link,
    r.demo_approve,
    r.demo_reject,
    r.hidden,
    r.verified_yes +
        CASE
            WHEN mv.verdict = 'approve'::verdict AND mv.self_banned AND mv.self_verified THEN 1
            ELSE 0
        END AS verified_approve,
    r.verified_no +
        CASE
            WHEN mv.verdict = 'reject'::verdict AND mv.self_banned AND mv.self_verified THEN 1
            ELSE 0
        END AS verified_reject,
    r.feature_ok
   FROM requests r
     JOIN profiles p ON p.id = r.user_id
     LEFT JOIN LATERAL ( SELECT v.verdict,
            private.is_banned(auth.uid()) AS self_banned,
            NOT COALESCE((auth.jwt() ->> 'is_anonymous'::text)::boolean, true) AS self_verified
           FROM votes v
          WHERE v.request_id = r.id AND v.user_id = auth.uid()) mv ON true
  WHERE NOT r.hidden OR r.user_id = auth.uid() OR is_admin();

grant select (feature_ok) on public.request_feed to authenticated;
