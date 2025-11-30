#!/bin/bash
FUNCTION_URL="https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/scrape-single-offer"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE"

PRIORITY_URLS=(
  "https://www.enel.it/it/luce-e-gas/luce"
  "https://www.eniplenitude.com/it/casa/offerte-luce"
  "https://www.edisonenergia.it/casa/luce"
  "https://www.a2aenergia.eu/casa/luce"
  "https://www.gruppohera.it/clienti/casa/luce"
  "https://lucegas.iren.it/offerte-luce"
  "https://www.acea.it/energia/offerte-luce"
  "https://www.sorgenia.it/offerte/luce"
  "https://www.illumia.it/offerte-luce"
  "https://www.nen.it/offerte"
)

COMPARATOR_URLS=(
  "https://www.sostariffe.it/energia-elettrica/"
  "https://www.facile.it/luce-gas/offerte-luce.html"
  "https://www.segugio.it/energia-gas/offerte-luce.aspx"
)

echo "=========================================="
echo "BillSnap - Comprehensive Scraping"
echo "$(date)"
echo "=========================================="

TOTAL_FOUND=0
TOTAL_SAVED=0

scrape_url() {
  local URL=$1
  local INDEX=$2
  local TOTAL=$3
  
  echo "[$INDEX/$TOTAL] $URL"
  
  RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"$URL\"}" \
    --max-time 90)
  
  if echo "$RESPONSE" | grep -q '"success":true'; then
    FOUND=$(echo "$RESPONSE" | grep -o '"offers_found":[0-9]*' | grep -o '[0-9]*' || echo "0")
    SAVED=$(echo "$RESPONSE" | grep -o '"offers_saved":[0-9]*' | grep -o '[0-9]*' || echo "0")
    echo "  ✓ Found: $FOUND, Saved: $SAVED"
    TOTAL_FOUND=$((TOTAL_FOUND + FOUND))
    TOTAL_SAVED=$((TOTAL_SAVED + SAVED))
  else
    echo "  ✗ Failed"
  fi
  echo ""
}

echo "PHASE 1: PRIORITY PROVIDERS"
for i in "${!PRIORITY_URLS[@]}"; do
  scrape_url "${PRIORITY_URLS[$i]}" "$((i+1))" "${#PRIORITY_URLS[@]}"
  [ $i -lt $((${#PRIORITY_URLS[@]} - 1)) ] && sleep 5
done

echo "PHASE 2: COMPARATORS"
for i in "${!COMPARATOR_URLS[@]}"; do
  scrape_url "${COMPARATOR_URLS[$i]}" "$((i+1))" "${#COMPARATOR_URLS[@]}"
  [ $i -lt $((${#COMPARATOR_URLS[@]} - 1)) ] && sleep 5
done

echo "=========================================="
echo "COMPLETED!"
echo "Total found: $TOTAL_FOUND"
echo "Total saved: $TOTAL_SAVED"
echo "=========================================="
