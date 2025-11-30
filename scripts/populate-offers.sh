#!/bin/bash

# BillSnap - Real Offers Population Script
# Uses specific offer list URLs for better scraping results

FUNCTION_URL="https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/scrape-single-offer"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE"

# More specific URLs that should contain offer lists
# Using comparator sites and direct offer pages
URLS=(
  "https://www.segugio.it/energia-gas/offerte-luce.aspx"
  "https://www.facile.it/luce-gas/offerte-luce.html"
  "https://www.sostariffe.it/energia-elettrica/"
)

echo "=========================================="
echo "BillSnap - Real Offers Population"
echo "=========================================="
echo ""
echo "Testing ${#URLS[@]} URLs with improved scraping"
echo ""

TOTAL_FOUND=0
TOTAL_SAVED=0

for i in "${!URLS[@]}"; do
  URL="${URLS[$i]}"
  echo "[$((i+1))/${#URLS[@]}] Scraping: $URL"
  
  RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$URL\"}" \
    --max-time 60)
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    OFFERS_FOUND=$(echo "$RESPONSE" | grep -o '"offers_found":[0-9]*' | grep -o '[0-9]*')
    OFFERS_SAVED=$(echo "$RESPONSE" | grep -o '"offers_saved":[0-9]*' | grep -o '[0-9]*')
    echo "  ✓ Success: Found $OFFERS_FOUND offers, saved $OFFERS_SAVED"
    TOTAL_FOUND=$((TOTAL_FOUND + OFFERS_FOUND))
    TOTAL_SAVED=$((TOTAL_SAVED + OFFERS_SAVED))
  else
    ERROR=$(echo "$RESPONSE" | grep -o '"error":"[^"]*"' | head -1)
    echo "  ✗ Failed: $ERROR"
    echo "  Response preview: $(echo "$RESPONSE" | head -c 200)"
  fi
  
  echo ""
  
  if [ $i -lt $((${#URLS[@]} - 1)) ]; then
    echo "  Waiting 5 seconds before next request..."
    sleep 5
  fi
done

echo "=========================================="
echo "SCRAPING COMPLETED!"
echo "=========================================="
echo "Total offers found: $TOTAL_FOUND"
echo "Total offers saved: $TOTAL_SAVED"
echo ""
echo "Check Supabase table 'offers_scraped' to see results."
