#!/bin/bash

# Test script for send-review-otp function
echo "Testing send-review-otp function..."
echo ""

# Get the Supabase URL and anon key from the environment
SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env | cut -d'"' -f2)
SUPABASE_ANON_KEY=$(grep "VITE_SUPABASE_ANON_KEY" .env | cut -d'"' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "Error: Could not find SUPABASE_URL or SUPABASE_ANON_KEY"
    exit 1
fi

echo "Supabase URL: $SUPABASE_URL"
echo "Testing with email: francesca.achilli@hotmail.com"
echo ""

# Call the function
response=$(curl -s -w "\n%{http_code}" --location --request POST "${SUPABASE_URL}/functions/v1/send-review-otp" \
  --header "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  --header "Content-Type: application/json" \
  --data '{"email":"francesca.achilli@hotmail.com"}')

# Extract status code and body
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "HTTP Status Code: $http_code"
echo ""
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo "✅ Success!"
else
    echo "❌ Error occurred"
fi
