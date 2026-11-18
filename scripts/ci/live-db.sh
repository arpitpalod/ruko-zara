# Shared helpers for CI scripts that read the live database. Source this file; needs SUPABASE_DB_PASSWORD.
# Postgres 17 tools run in Docker (the live database runs 17; the runner's own client is older).
REF=ehptarxgjmtbrxerwxim
LIVE_USER="postgres.$REF"
WORK=${WORK:-$(mktemp -d)}

pg() { docker run --rm -i --network host --user "$(id -u):$(id -g)" -e PGPASSWORD -e PGSSLMODE -v "$PWD:/repo:ro" -v "$WORK:/work" -w /repo postgres:17 "$@"; }
live() { PGPASSWORD="$SUPABASE_DB_PASSWORD" PGSSLMODE=require pg "$@" -h "$LIVE_HOST" -p 5432 -U "$LIVE_USER" -d postgres; }

# The direct database address is IPv6-only; GitHub's runners need the IPv4 connection pooler (session mode).
find_live_host() {
  [ -n "${SUPABASE_DB_PASSWORD:-}" ] || { echo "::error::SUPABASE_DB_PASSWORD secret is not set"; return 1; }
  for host in aws-1-ap-south-1.pooler.supabase.com aws-0-ap-south-1.pooler.supabase.com; do
    LIVE_HOST=$host
    if live psql -X -tAc 'select 1' >/dev/null 2>&1; then echo "Connected to the live database via $host"; return 0; fi
  done
  LIVE_HOST=""
  echo "::error::Could not connect to the live database (wrong SUPABASE_DB_PASSWORD?)"
  return 1
}
