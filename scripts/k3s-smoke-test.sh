#!/usr/bin/env bash
set -euo pipefail

echo "==> 1. Testing Keycloak direct grant for lawyer@ilcms.is..."
AUTH_RESP=$(curl -s -X POST "http://auth.ilcms.local/realms/ilcms/protocol/openid-connect/token"   -H "Content-Type: application/x-www-form-urlencoded"   -d "client_id=ilcms-backend"   -d "grant_type=password"   -d "username=lawyer@ilcms.is"   -d "password=password123")

TOKEN=$(python3 -c '
import sys, json
try:
    print(json.loads(sys.argv[1]).get("access_token", ""))
except:
    print("")
' "$AUTH_RESP")

if [ -z "$TOKEN" ]; then
  echo "Auth failed: $AUTH_RESP"
  exit 1
fi
echo "✔ Keycloak token acquired."

echo "==> 2. Testing API health endpoint..."
curl -sf "http://ilcms.local/api/v1/healthz" >/dev/null
echo "✔ API healthz OK."

echo "==> 3. Testing Case query over Traefik ingress..."
CASES=$(curl -sf "http://ilcms.local/api/v1/cases" -H "Authorization: Bearer $TOKEN")
COUNT=$(echo "$CASES" | python3 -c 'import sys, json; print(len(json.loads(sys.stdin.read())))')
echo "✔ Cases returned: $COUNT active cases found."

echo ""
echo "=========================================================="
echo "✔ All tests passed! The system is fully operational."
echo "Access the dashboard at: http://ilcms.local/"
echo "Login: lawyer@ilcms.is / password123"
echo "=========================================================="
