#!/bin/bash

echo "🔍 Test Resend API"
echo ""
echo "Inserisci la tua chiave Resend (inizia con re_):"
read -r RESEND_KEY

echo ""
echo "📧 Invio email di test..."

curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "giorgio.arghittu@gmail.com",
    "subject": "Test BillSnap Resend",
    "html": "<h1>Test Email</h1><p>Se ricevi questa email, Resend funziona!</p>"
  }'

echo ""
echo ""
echo "✅ Se vedi {\"id\":\"...\"} la chiave funziona!"
echo "❌ Se vedi errore, la chiave non è valida"
