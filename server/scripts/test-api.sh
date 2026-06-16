#!/usr/bin/env bash
# End-to-end HTTP test of every route group. Requires the server running on :4000
# and a seeded DB. Prints PASS/FAIL per check.
set -u
BASE=http://localhost:4000
pass=0; fail=0
chk() { if [ "$1" = "$2" ]; then pass=$((pass+1)); echo "  ✓ $3 ($1)"; else fail=$((fail+1)); echo "  ✗ $3 (got $1, want $2)"; fi; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
jq_get() { curl -s "$@"; }

echo "AUTH"
# bad login -> 401
chk "$(code -X POST $BASE/login -H 'Content-Type: application/json' -d '{"username":"shaked.h","password":"wrong"}')" 401 "bad login 401"
# good login -> 200 + token
LOGIN=$(jq_get -X POST $BASE/login -H 'Content-Type: application/json' -d '{"username":"shaked.h","password":"pulse123"}')
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
HASPW=$(echo "$LOGIN" | python3 -c 'import sys,json;d=json.load(sys.stdin);print("yes" if ("website" in d or "password" in d or "password_hash" in d) else "no")')
chk "$([ -n "$TOKEN" ] && echo ok)" ok "good login returns token"
chk "$HASPW" no "login response hides password"
AUTH="-H Authorization:Bearer-$TOKEN"   # placeholder, replaced below
H=(-H "Authorization: Bearer $TOKEN")

# Two NON-admin users for ownership tests (user1/shaked.h is admin and bypasses
# ownership by design, so we use maya_c as owner and dan_l as the "other").
TOKEN_OWNER=$(jq_get -X POST $BASE/login -H 'Content-Type: application/json' -d '{"username":"maya_c","password":"hello456"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
HO=(-H "Authorization: Bearer $TOKEN_OWNER")
OWNER_ID=$(jq_get -X POST $BASE/login -H 'Content-Type: application/json' -d '{"username":"maya_c","password":"hello456"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))')
TOKEN_OTHER=$(jq_get -X POST $BASE/login -H 'Content-Type: application/json' -d '{"username":"dan_l","password":"sunny789"}' | python3 -c 'import sys,json;print(json.load(sys.stdin).get("token",""))')
HX=(-H "Authorization: Bearer $TOKEN_OTHER")
# Keep H2 as the "other" alias used below
H2=("${HX[@]}")

echo "USERNAME AVAILABILITY"
chk "$(jq_get "$BASE/username-available?username=shaked.h" | python3 -c 'import sys,json;print(json.load(sys.stdin)["available"])')" "False" "taken username -> not available"
chk "$(jq_get "$BASE/username-available?username=brand_new_xyz" | python3 -c 'import sys,json;print(json.load(sys.stdin)["available"])')" "True" "free username -> available"

echo "AUTH GUARD"
chk "$(code $BASE/todos)" 401 "todos without token -> 401"
chk "$(code "${H[@]}" $BASE/todos?userId=1)" 200 "todos with token -> 200"

echo "TODOS (owner=maya_c, other=dan_l)"
chk "$(code "${HO[@]}" "$BASE/todos?userId=$OWNER_ID&_sort=id")" 200 "list todos sorted"
NEWTODO=$(jq_get -X POST "${HO[@]}" -H 'Content-Type: application/json' $BASE/todos -d '{"title":"e2e todo","completed":false}')
TID=$(echo "$NEWTODO" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
chk "$([ -n "$TID" ] && echo ok)" ok "create todo"
chk "$(code -X PATCH "${HO[@]}" -H 'Content-Type: application/json' $BASE/todos/$TID -d '{"completed":true}')" 200 "patch todo"
chk "$(code -X DELETE "${HX[@]}" $BASE/todos/$TID)" 403 "other user cannot delete owner's todo"
chk "$(code -X DELETE "${HO[@]}" $BASE/todos/$TID)" 200 "owner deletes todo"

echo "POSTS + COMMENTS (ownership)"
NEWPOST=$(jq_get -X POST "${HO[@]}" -H 'Content-Type: application/json' $BASE/posts -d '{"title":"e2e post","body":"hi"}')
PID=$(echo "$NEWPOST" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
chk "$([ -n "$PID" ] && echo ok)" ok "create post"
chk "$(code -X PUT "${HX[@]}" -H 'Content-Type: application/json' $BASE/posts/$PID -d '{"title":"hacked"}')" 403 "other user cannot edit owner's post"
chk "$(code -X PUT "${HO[@]}" -H 'Content-Type: application/json' $BASE/posts/$PID -d '{"title":"edited"}')" 200 "owner edits post"
NEWC=$(jq_get -X POST "${HX[@]}" -H 'Content-Type: application/json' $BASE/comments -d "{\"postId\":\"$PID\",\"body\":\"nice\"}")
CID=$(echo "$NEWC" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
chk "$([ -n "$CID" ] && echo ok)" ok "other user comments on owner's post"
chk "$(code -X DELETE "${HO[@]}" $BASE/comments/$CID)" 403 "post owner cannot delete others' comment"
chk "$(code -X DELETE "${HX[@]}" $BASE/comments/$CID)" 200 "comment owner deletes own comment"
chk "$(code -X DELETE "${HO[@]}" $BASE/posts/$PID)" 200 "owner deletes post"

echo "ALBUMS + PHOTOS"
chk "$(code "${H[@]}" "$BASE/albums?userId=1")" 200 "list albums"
chk "$(code "${H[@]}" "$BASE/photos?albumId=1&_page=1&_per_page=3")" 200 "photos paginated"

echo "PROFILE + PASSWORD (non-admin self-service)"
chk "$(code -X PATCH "${HO[@]}" -H 'Content-Type: application/json' $BASE/users/$OWNER_ID -d '{"phone":"050-0000000"}')" 200 "patch own profile"
chk "$(code -X PATCH "${HX[@]}" -H 'Content-Type: application/json' $BASE/users/$OWNER_ID -d '{"phone":"x"}')" 403 "cannot patch other profile"
chk "$(code -X PATCH "${HO[@]}" -H 'Content-Type: application/json' $BASE/users/$OWNER_ID/password -d '{"currentPassword":"wrong","newPassword":"newpass1"}')" 401 "wrong current password rejected"

echo "ADMIN (user1 is admin)"
chk "$(code "${H[@]}" $BASE/admin/stats)" 200 "admin stats ok"
chk "$(code "${HO[@]}" $BASE/admin/stats)" 403 "non-admin blocked from admin"

echo ""
echo "RESULT: $pass passed, $fail failed"
[ "$fail" -eq 0 ]
