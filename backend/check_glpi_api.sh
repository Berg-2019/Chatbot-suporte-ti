#!/bin/bash
APP_TOKEN="BuOrNKyWVWdZiHXctkRA4ZbXgvdYzzBYNbUmDacH"
USER_TOKEN="QjRYoaQJSFugPHcO3gIij6G03x6BzpGCb9iqW60T"
URL="http://localhost:8080/apirest.php"

# Init Session
echo "Initializing session..."
SESSION_RESP=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "App-Token: $APP_TOKEN" \
  -H "Authorization: user_token $USER_TOKEN" \
  "$URL/initSession")

echo "Session Response: $SESSION_RESP"

# Extract token using grep/cut if jq is missing, or python/node
SESSION_TOKEN=$(echo $SESSION_RESP | grep -o '"session_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_TOKEN" ]; then
  echo "Failed to get session token"
  exit 1
fi

echo "Session Token: $SESSION_TOKEN"

# Check Ticket 627521
echo "Checking Ticket 627521..."
curl -s -X GET \
  -H "App-Token: $APP_TOKEN" \
  -H "Session-Token: $SESSION_TOKEN" \
  "$URL/Ticket/627521"

echo ""
echo "Checking Ticket 711542..."
curl -s -X GET \
  -H "App-Token: $APP_TOKEN" \
  -H "Session-Token: $SESSION_TOKEN" \
  "$URL/Ticket/711542"
