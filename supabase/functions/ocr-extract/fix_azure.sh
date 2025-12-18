#!/bin/bash
# Fix: line 44 in index.ts
cd "/Users/giorgioarghittu/.gemini/antigravity/brain/c5e5fa9f-5292-4533-89d4-8ede46c86db1/Billsnap project Antigravity/supabase/functions/ocr-extract"

# Create temp file with fix
cat > temp_fix.ts << 'EOF'
  try {
    console.log("[AZURE] Starting document analysis...");
    
    // Remove trailing slash from endpoint to prevent double slashes
    const endpoint = azureEndpoint.endsWith("/") ? azureEndpoint.slice(0, -1) : azureEndpoint;
    const analyzeUrl = endpoint + "/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30";
EOF

# Backup
cp index.ts index.ts.bak

# Replace lines 41-44 with fixed version
head -40 index.ts > index_new.ts
cat temp_fix.ts >> index_new.ts
tail -n +45 index.ts >> index_new.ts
mv index_new.ts index.ts
rm temp_fix.ts

echo "✅ Fix applied successfully"
