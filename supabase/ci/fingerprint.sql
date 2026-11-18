-- One line per security-relevant object in the public and private schemas (tables, columns, functions, policies,
-- triggers, view definitions) with a hash of its definition and permissions.
-- CI runs this on the live database and on the test copy: any difference means the copy isn't faithful.
select kind || ' ' || name || ' ' || md5(detail)
from (
  select 'table' as kind, c.relname as name,
         c.relkind::text || c.relrowsecurity::text || coalesce((
           select string_agg(regexp_replace(x::text, '/.*$', ''), ',' order by x::text) from unnest(c.relacl) x), '') as detail
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'v')
  union all
  select 'column', c.relname || '.' || a.attname,
         format_type(a.atttypid, a.atttypmod) || a.attnotnull::text || coalesce((
           select string_agg(regexp_replace(x::text, '/.*$', ''), ',' order by x::text) from unnest(a.attacl) x), '')
  from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'v') and a.attnum > 0 and not a.attisdropped
  union all
  select 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         pg_get_functiondef(p.oid) || coalesce((
           select string_agg(regexp_replace(x::text, '/.*$', ''), ',' order by x::text) from unnest(p.proacl) x), 'default')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prokind = 'f'
  union all
  select 'policy', tablename || '.' || policyname,
         permissive || cmd || roles::text || coalesce(qual, '') || coalesce(with_check, '')
  from pg_policies where schemaname in ('public', 'private')
  union all
  select 'trigger', c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and not t.tgisinternal
  union all
  select 'view', viewname, definition from pg_views where schemaname in ('public', 'private')
) s
order by 1;
