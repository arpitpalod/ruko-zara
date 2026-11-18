#!/usr/bin/env bash
# Database tests, run by GitHub Actions on every change.
#  1. Copies the live database's structure (tables, rules, functions, permissions; no user data)
#     into a throwaway local Supabase started by `supabase start`.
#  2. Checks the copy matches the live database exactly (fingerprint of every rule and permission).
#  3. Applies any not-yet-live database changes from supabase/pending/ (a dress rehearsal).
#  4. Runs the security tests in supabase/tests/.
# Needs SUPABASE_DB_PASSWORD (GitHub secret). Never prints it.
set -euo pipefail

LOCAL_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
source "$(dirname "$0")/live-db.sh"
local_sql() { PGPASSWORD= PGSSLMODE=disable pg psql "$LOCAL_URL" -X -v ON_ERROR_STOP=1 "$@"; }

echo "::group::Find the live database"
find_live_host
echo "::endgroup::"

echo "::group::Copy live structure"
live pg_dump --schema-only --schema=public --schema=private --no-owner -f /work/live_schema.sql
live pg_dump --data-only --table=public.blocked_words --table=public.allowed_link_domains -f /work/live_lookup.sql
live psql -X -tA -f supabase/ci/fingerprint.sql > "$WORK/fp_live.txt"
# The local database already has a public schema.
sed -i -e '/^CREATE SCHEMA public;$/d' -e '/^COMMENT ON SCHEMA public IS/d' "$WORK/live_schema.sql"
# Default privileges of Supabase's internal roles can't be set by the local postgres user (and don't affect the tests).
sed -i -E '/^ALTER DEFAULT PRIVILEGES FOR ROLE [a-z_]+ /{/FOR ROLE postgres /!d}' "$WORK/live_schema.sql"
echo "Live: $(wc -l < "$WORK/fp_live.txt") rules and permissions"
echo "::endgroup::"

echo "::group::Build the test copy"
# New tables would otherwise get Supabase's default grants; the copy must carry the live permissions only.
local_sql -q -c "
  alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
  alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
  alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;"
local_sql -q -f /work/live_schema.sql
local_sql -q -f /work/live_lookup.sql
local_sql -q -f supabase/ci/after_copy.sql
local_sql -tA -f supabase/ci/fingerprint.sql > "$WORK/fp_local.txt"
if ! diff -u "$WORK/fp_live.txt" "$WORK/fp_local.txt" > "$WORK/fp.diff"; then
  echo "::error::The test copy does not match the live database:"
  grep '^[-+][a-z]' "$WORK/fp.diff" | cut -d' ' -f1-2 | head -40
  exit 1
fi
echo "Test copy matches the live database"
echo "::endgroup::"

shopt -s nullglob
pending=(supabase/pending/*.sql)
if [ ${#pending[@]} -gt 0 ]; then
  echo "::group::Rehearse database changes not yet live"
  for f in "${pending[@]}"; do echo "Applying $f"; local_sql -q -f "$f"; done
  echo "::endgroup::"
fi

status=0
for f in supabase/tests/*.test.sql; do
  echo "::group::$f"
  if ! local_sql -f "$f" > "$WORK/out.txt" 2>&1; then status=1; fi
  cat "$WORK/out.txt"
  if grep -qE '^not ok|^# Looks like' "$WORK/out.txt"; then status=1; fi
  echo "::endgroup::"
  grep -E '^not ok' "$WORK/out.txt" | sed 's/^/::error::/' || true
done
[ $status -eq 0 ] && echo "All database tests passed"
exit $status
