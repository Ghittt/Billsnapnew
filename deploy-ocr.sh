#!/bin/bash

# Deploy OCR Function to Supabase
PROJECT_REF="jxluygtonamgadqgzgyh"
FUNCTION_NAME="ocr-extract"

echo "🚀 Deploying OCR function to Supabase..."

# Check if supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found."
    echo "Please install it first:"
    echo "  brew install supabase/tap/supabase"
    echo "Or download from: https://github.com/supabase/cli/releases"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in. Running login..."
    supabase login
fi

# Deploy
echo "📦 Deploying function..."
supabase functions deploy $FUNCTION_NAME --project-ref $PROJECT_REF

if [ $? -eq 0 ]; then
    echo "✅ Function deployed successfully!"
else
    echo "❌ Deployment failed"
    exit 1
fi
