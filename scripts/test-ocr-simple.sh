#!/bin/bash

# Configuration
FUNCTION_URL="https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/ocr-extract"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE"

echo "Testing OCR Endpoint: $FUNCTION_URL"

# Valid 1x1 Pixel Red Dot PNG Base64
DUMMY_PNG_B64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

# Create payload file to avoid shell expansion issues
cat <<EOT > payload.json
{
  "uploadId": "00000000-0000-0000-0000-000000000000",
  "fileBase64": "$DUMMY_PNG_B64",
  "fileName": "test_pixel.png",
  "fileType": "image/png"
}
EOT

echo "Sending Payload..."
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ANON_KEY" \
  -d @payload.json

# Cleanup
rm payload.json

echo ""
echo "Done."
