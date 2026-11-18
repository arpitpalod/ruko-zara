#!/usr/bin/env bash
# Emails the owner: adds a row to private.alerts in the live database, which sends the email.
# Usage: alert.sh "Subject" body.txt      (needs SUPABASE_DB_PASSWORD)
# If the database itself is unreachable this fails; the GitHub issue is the backup channel.
set -uo pipefail
source "$(dirname "$0")/live-db.sh"
find_live_host || exit 1
subject=$1
body=$(cat "$2")
printf "insert into private.alerts (subject, body) values (:'subject', :'body');\n" |
  live psql -X -q -v ON_ERROR_STOP=1 -v subject="$subject" -v body="$body" &&
  echo "Alert email queued: $subject"
