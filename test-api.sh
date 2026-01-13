#!/bin/bash

# Quick API Testing Script
# Usage: ./test-api.sh [base_url]
# Example: ./test-api.sh http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing Kingston Happenings API${NC}"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Get Events
echo -e "${GREEN}Test 1: Get All Events${NC}"
curl -s "$BASE_URL/api/events" | jq '.' || echo "Failed"
echo ""

# Test 2: Get Venues
echo -e "${GREEN}Test 2: Get All Venues${NC}"
curl -s "$BASE_URL/api/venues" | jq '.' || echo "Failed"
echo ""

# Test 3: Get Likes (Public)
echo -e "${GREEN}Test 3: Get Likes (Public)${NC}"
curl -s "$BASE_URL/api/likes" | jq '.' || echo "Failed"
echo ""

# Test 4: Test Validation (Should Fail)
echo -e "${YELLOW}Test 4: Test Validation (Invalid Input - Should Fail)${NC}"
curl -s -X POST "$BASE_URL/api/events" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}' | jq '.' || echo "Failed"
echo ""

echo -e "${GREEN}Basic API tests complete!${NC}"
echo ""
echo "To test authenticated endpoints, you need to:"
echo "1. Register a user: curl -X POST $BASE_URL/api/auth/register -H 'Content-Type: application/json' -d '{\"email\":\"test@example.com\",\"password\":\"test123\",\"name\":\"Test\"}'"
echo "2. Login and save the session cookie"
echo "3. Use the cookie in subsequent requests"
