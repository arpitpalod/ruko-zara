#!/usr/bin/env bash
# Nightly backup of the live database: app data (public schema) + login accounts (auth users),
# compressed and encrypted with the backup public key in supabase/ci/backup-recipient.txt.
# Only the holder of the matching private key can open it. Never prints the password.
set -euo pipefail
source "$(dirname "$0")/live-db.sh"
find_live_host

STAMP=$(date -u +%Y-%m-%dT%H%MZ)
mkdir -p "$WORK/dump" backup
live pg_dump --schema=public --no-owner --format=custom -f /work/dump/public.dump
live pg_dump --data-only --table=auth.users --table=auth.identities --format=custom -f /work/dump/auth_users.dump
live psql -X -tA -c "select 'arzi=' || (select count(*) from public.requests) || ' votes=' || (select count(*) from public.votes) || ' users=' || (select count(*) from auth.users)" > "$WORK/counts.txt"

tar -C "$WORK/dump" -czf "$WORK/ruko-zara-$STAMP.tar.gz" .
age -R supabase/ci/backup-recipient.txt -o "backup/ruko-zara-$STAMP.tar.gz.age" "$WORK/ruko-zara-$STAMP.tar.gz"
rm -rf "$WORK/dump" "$WORK/ruko-zara-$STAMP.tar.gz"

size=$(stat -c %s "backup/ruko-zara-$STAMP.tar.gz.age")
[ "$size" -gt 1000 ] || { echo "::error::Backup looks empty ($size bytes)"; exit 1; }
echo "Backup ruko-zara-$STAMP: $((size / 1024)) KB, $(cat "$WORK/counts.txt" 2>/dev/null || true)"
