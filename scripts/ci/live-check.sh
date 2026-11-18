#!/usr/bin/env bash
# Checks the live app from the outside, like a visitor (or an attacker) would. Run hourly and after each release.
set -uo pipefail
WEB=https://arpitpalod.github.io/ruko-zara
API=https://ehptarxgjmtbrxerwxim.supabase.co
KEY=sb_publishable_zzkKt2NP7Ik8PDgaayC9jw_--3SFuTl   # public by design (it's in the app)
APK=https://github.com/arpitpalod/ruko-zara/releases/download/android-latest/app-release.apk
failed=0

ok()   { echo "✅ $1"; }
bad()  { echo "❌ $1"; failed=1; }
code() { curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$@"; }

# 1. The app is up
curl -sf --max-time 25 "$WEB/" | grep -q '_expo/static/js' && ok "Website loads" || bad "Website is down or broken"
for p in captcha.html privacy.html terms.html; do
  c=$(code "$WEB/$p"); [ "$c" = 200 ] && ok "$p" || bad "$p returned $c"
done
c=$(code -I "$APK"); [[ "$c" =~ ^(200|302)$ ]] && ok "Android download link" || bad "Android download returned $c"

# 2. Someone who isn't signed in can read nothing
for t in profiles requests votes comments reports blocks admins blocked_words allowed_link_domains request_feed; do
  c=$(code -H "apikey: $KEY" "$API/rest/v1/$t?select=*&limit=1")
  [[ "$c" =~ ^(401|403|404)$ ]] && ok "Outsider can't read $t" || bad "OUTSIDER CAN READ $t (HTTP $c)"
done
for f in is_admin guest_votes_left delete_my_account admin_set_hidden admin_set_banned admin_banned_ids alerts_take alerts_mark_sent; do
  c=$(code -X POST -H "apikey: $KEY" -H 'Content-Type: application/json' -d '{}' "$API/rest/v1/rpc/$f")
  [[ "$c" =~ ^(401|403|404)$ ]] && ok "Outsider can't call $f" || bad "OUTSIDER CAN CALL $f (HTTP $c)"
done

# Called with a real argument: an empty body would miss the function and pass for the wrong reason.
c=$(code -X POST -H "apikey: $KEY" -H 'Content-Type: application/json' -d '{"target":"00000000-0000-0000-0000-000000000000"}' "$API/rest/v1/rpc/vote_reasons")
[[ "$c" =~ ^(401|403)$ ]] && ok "Outsider can't read vote reasons" || bad "OUTSIDER CAN READ VOTE REASONS (HTTP $c)"

c=$(code -H "apikey: $KEY" "$API/rest/v1/banned_users?select=*")
[[ "$c" =~ ^(401|403|404)$ ]] && ok "Ban list is not reachable" || bad "BAN LIST REACHABLE (HTTP $c)"

# 2b. The read-only preview (new phones see arzi before sign-in) shows only what it should
pv=$(curl -s --max-time 25 -X POST -H "apikey: $KEY" -H 'Content-Type: application/json' -d '{"kind":"open"}' "$API/rest/v1/rpc/public_feed")
if echo "$pv" | python3 -c 'import json,sys; r=json.load(sys.stdin); assert isinstance(r,list) and r' 2>/dev/null; then ok "Preview shows open arzi"; else bad "Preview of open arzi is broken"; fi
echo "$pv" | python3 -c '
import json,sys
r=json.load(sys.stdin)
assert all("user_id" not in x for x in r), "user ids"
assert all(x["approve_count"]==0 and x["reject_count"]==0 for x in r), "vote split of open arzi"
' 2>/dev/null && ok "Preview has no user ids and no open vote splits" || bad "PREVIEW LEAKS user ids or how people voted"
pc=$(curl -s --max-time 25 -X POST -H "apikey: $KEY" -H 'Content-Type: application/json' -d '{"target":"00000000-0000-0000-0000-000000000000"}' "$API/rest/v1/rpc/public_comments")
echo "$pc" | python3 -c 'import json,sys; assert json.load(sys.stdin)==[]' 2>/dev/null && ok "Comment preview works" || bad "Comment preview is broken"

# 3. Bots can't create accounts without passing the bot check
body=$(curl -s --max-time 25 -X POST -H "apikey: $KEY" -H 'Content-Type: application/json' -d '{}' "$API/auth/v1/signup")
echo "$body" | grep -qi captcha && ok "Bot check is on" || bad "BOT CHECK IS OFF: accounts can be created without it"

# 4. The email job can't be triggered by strangers
c=$(code -X POST "$API/functions/v1/verdict-emails"); [ "$c" = 401 ] && ok "Verdict email job is locked" || bad "Verdict email job returned $c"

exit $failed
