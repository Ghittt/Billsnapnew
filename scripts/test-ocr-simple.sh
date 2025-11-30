#!/bin/bash

# Configuration
FUNCTION_URL="https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/ocr-extract"
TEST_FILE="./test-bill.pdf"

# Check if file exists
if [ ! -f "$TEST_FILE" ]; then
    echo "Creating dummy PDF for testing..."
    cat > "$TEST_FILE" << 'PDFEOF'
%PDF-1.0
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000111 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF
PDFEOF
fi

# Generate a valid UUID for uploadId
UPLOAD_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')

echo "Testing OCR Function at $FUNCTION_URL..."
echo "Upload ID: $UPLOAD_ID"

curl -i -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -F "file=@$TEST_FILE;type=application/pdf" \
  -F "uploadId=$UPLOAD_ID"

echo -e "\n\nDone."
