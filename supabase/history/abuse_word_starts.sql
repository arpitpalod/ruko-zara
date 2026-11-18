-- The abuse filter matched whole words only, so a slur joined to another word ("randikhana") got through.
-- Severe slurs now also match at the start of a longer word. Only words that don't begin common
-- innocent words are marked (e.g. not "chut" → chutney, "gaand" → Gandhi, "dick" → Dickens, "kutiya" → Kutiyana).
alter table public.blocked_words add column if not exists match_start boolean not null default false;

update public.blocked_words set match_start = true where word in (
  'randi', 'bhosda', 'bhosdi', 'bhosdike', 'madarchod', 'maderchod', 'behenchod', 'bhenchod', 'bhainchod',
  'chutiya', 'chutia', 'chutiye', 'gandu', 'harami', 'haramkhor', 'fuck', 'motherfucker', 'bitch', 'slut',
  'whore', 'cunt', 'रंडी', 'मादरचोद', 'बहनचोद', 'भेनचोद', 'भोसडीके', 'भोसड़ीके', 'चूतिया', 'चुतिया', 'हरामी', 'हरामखोर'
);

create or replace function public.contains_abuse(t text) returns boolean
language sql stable security definer set search_path = 'public' as $$
  select exists (
    select 1 from public.blocked_words w
    where position(' ' || public.normalize_text(w.word) || ' ' in ' ' || public.normalize_text(t) || ' ') > 0
       or (w.match_start and position(' ' || public.normalize_text(w.word) in ' ' || public.normalize_text(t)) > 0)
  )
$$;
