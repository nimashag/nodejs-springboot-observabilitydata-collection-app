API_BASE="http://localhost:3008"
API_KEY="${API_KEY:-}"

echo "=========================================="
echo "AATA API Test Script"
echo "=========================================="
echo ""

# Set authorization header if API_KEY is provided
if [ -n "$API_KEY" ]; then
  AUTH_HEADER="Authorization: Bearer $API_KEY"
  echo "Using API Key: ${API_KEY:0:10}..."
else
  AUTH_HEADER=""
  echo "No API Key set (authentication disabled)"
fi
echo ""

# Test 1: Health Check (no auth required)
echo "1. Testing Health Check Endpoint"
echo "GET /api/health"
echo "------------------------------------------"
curl -s "$API_BASE/api/health" | jq '.'
echo ""
echo ""

# Test 2: Summary
echo "2. Testing Summary Endpoint"
echo "GET /api/summary"
echo "------------------------------------------"
if [ -n "$AUTH_HEADER" ]; then
  curl -s -H "$AUTH_HEADER" "$API_BASE/api/summary" | jq '.'
else
  curl -s "$API_BASE/api/summary" | jq '.'
fi
echo ""
echo ""

# Test 3: Alerts (first page)
echo "3. Testing Alerts Endpoint (paginated)"
echo "GET /api/alerts?page=1&limit=5"
echo "------------------------------------------"
if [ -n "$AUTH_HEADER" ]; then
  curl -s -H "$AUTH_HEADER" "$API_BASE/api/alerts?page=1&limit=5" | jq '.pagination'
else
  curl -s "$API_BASE/api/alerts?page=1&limit=5" | jq '.pagination'
fi
echo ""
echo ""

# Test 4: Recommendations
echo "4. Testing Recommendations Endpoint"
echo "GET /api/recommendations"
echo "------------------------------------------"
if [ -n "$AUTH_HEADER" ]; then
  curl -s -H "$AUTH_HEADER" "$API_BASE/api/recommendations" | jq 'length'
else
  curl -s "$API_BASE/api/recommendations" | jq 'length'
fi
echo " recommendations found"
echo ""
echo ""

# Test 5: Routing
echo "5. Testing Routing Endpoint"
echo "GET /api/routing"
echo "------------------------------------------"
if [ -n "$AUTH_HEADER" ]; then
  curl -s -H "$AUTH_HEADER" "$API_BASE/api/routing" | jq '.summary'
else
  curl -s "$API_BASE/api/routing" | jq '.summary'
fi
echo ""
echo ""

# Test 6: Invalid endpoint
echo "6. Testing Invalid Endpoint (404)"
echo "GET /api/invalid"
echo "------------------------------------------"
curl -s "$API_BASE/api/invalid" | jq '.'
echo ""
echo ""

# Test 7: Method not allowed
echo "7. Testing Method Not Allowed (405)"
echo "POST /api/summary"
echo "------------------------------------------"
if [ -n "$AUTH_HEADER" ]; then
  curl -s -X POST -H "$AUTH_HEADER" "$API_BASE/api/summary" | jq '.'
else
  curl -s -X POST "$API_BASE/api/summary" | jq '.'
fi
echo ""
echo ""

# Test 8: CORS Preflight
echo "8. Testing CORS Preflight (OPTIONS)"
echo "OPTIONS /api/summary"
echo "------------------------------------------"
curl -s -X OPTIONS -I "$API_BASE/api/summary" | grep -E "(HTTP|Access-Control)"
echo ""
echo ""

# Test 9: Unauthorized (if API_KEY is set)
if [ -n "$API_KEY" ]; then
  echo "9. Testing Unauthorized Access (401)"
  echo "GET /api/summary (without auth)"
  echo "------------------------------------------"
  curl -s "$API_BASE/api/summary" | jq '.'
  echo ""
  echo ""
fi

echo "=========================================="
echo "Test Complete"
echo "=========================================="

