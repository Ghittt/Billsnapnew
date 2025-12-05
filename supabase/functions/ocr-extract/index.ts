// @ts-nocheck
/**
 * OCR Extract Edge Function - Base64 JSON Version
 * 
 * Extracts data from Italian energy bills using Google Gemini 2.0 Flash.
 * Accepts base64-encoded files via JSON (compatible with supabase.functions.invoke).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment Configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY_2") || Deno.env.get("GEMINI_API_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ITALIAN_BILL_PROMPT = `
Sei un esperto analista di bollette energetiche italiane con 10 anni di esperienza.

OBIETTIVO:
Estrai TUTTI i dati dalla bolletta elettronica con MASSIMA PRECISIONE.

DATI DA ESTRARRE (formato JSON):
{
  "provider": "ENEL/ENI/A2A/Edison/Hera/etc",
  "bill_date": "2024-03-15",
  "period_start": "2024-01-01",
  "period_end": "2024-01-31",
  "period_days": 31,
  "annual_kwh": 2400.0,
  "kwh_period": 200.0,
  "total_cost_eur": 85.50,
  "f1_kwh": 1200.0,
  "f2_kwh": 800.0,
  "f3_kwh": 400.0,
  "potenza_kw": 3.0,
  "unit_price_eur_kwh": 0.28
}

REGOLE CRITICHE:
1. Se vedi "kWh anno" o "Consumo Annuo", quello è "annual_kwh"
2. Se vedi solo consumo del periodo, moltiplica x12 per annual_kwh
3. "Spesa totale" o "Totale bolletta" → total_cost_eur
4. Fascia F1/F2/F3 → consumi separati
5. "Potenza impegnata" o "Potenza disponibile" → potenza_kw
6. Se mancano F1/F2/F3, distribuisci: 50% F1, 33% F2, 17% F3

ESEMPIO OUTPUT:
{
  "provider": "ENEL Energia",
  "bill_date": "2024-03-15",
  "period_start": "2024-02-01",
  "period_end": "2024-02-29",
  "period_days": 29,
  "annual_kwh": 2400.0,
  "kwh_period": 200.0,
  "total_cost_eur": 85.50,
  "unit_price_eur_kwh": 0.28,
  "f1_kwh": 1200.0,
  "f2_kwh": 800.0,
  "f3_kwh": 400.0,
  "potenza_kw": 3.0
}

Analizza ora il documento.
`;

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate API Key
    if (!geminiApiKey) {
      console.error("[OCR] GEMINI_API_KEY missing");
      return new Response(
        JSON.stringify({ ok: false, error: "Server configuration error: Missing API key" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Validate HTTP Method
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ ok: false, error: "Method not allowed. Use POST." }),
        { status: 405, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Parse JSON Body
    const body = await req.json();
    const { fileBase64, fileName, fileType, uploadId } = body;

    if (!fileBase64 || !uploadId) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing fileBase64 or uploadId" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    console.log(`[OCR] Processing: ${fileName || 'unknown'}, Upload: ${uploadId}`);

    const mimeType = fileType || "application/pdf";

    // Gemini API Configuration
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          { text: ITALIAN_BILL_PROMPT },
          { inline_data: { mime_type: mimeType, data: fileBase64 } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048
      }
    };

    console.log("[OCR] Calling Gemini API...");
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`[OCR] Gemini API Error: ${geminiResponse.status}`, errorText);
      
      await supabase.from("uploads").update({
        ocr_status: "failed",
        ocr_error: `Gemini API Error: ${geminiResponse.status}`,
        ocr_completed_at: new Date().toISOString(),
      }).eq("id", uploadId);

      return new Response(
        JSON.stringify({ ok: false, error: `Gemini API Error: ${geminiResponse.status}` }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const geminiData = await geminiResponse.json();
    console.log("[OCR] Gemini response received");

    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!rawText) {
      console.error("[OCR] No text in Gemini response");
      return new Response(
        JSON.stringify({ ok: false, error: "No text extracted from document" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Extract JSON from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[OCR] No JSON found in response:", rawText);
      return new Response(
        JSON.stringify({ ok: false, error: "Failed to parse bill data" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    let extractedData;
    try {
      extractedData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("[OCR] JSON parse error:", parseError);
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid JSON from AI" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    console.log("[OCR] Extracted data:", extractedData);

    // Save to database with better error handling
    try {
      const { error: insertError } = await supabase.from("ocr_results").insert({
        upload_id: uploadId,
        provider: extractedData.provider || null,
        billing_period_start: extractedData.period_start || null,
        billing_period_end: extractedData.period_end || null,
        annual_kwh: extractedData.annual_kwh || null,
        total_cost_eur: extractedData.total_cost_eur || null,
        f1_kwh: extractedData.f1_kwh || null,
        f2_kwh: extractedData.f2_kwh || null,
        f3_kwh: extractedData.f3_kwh || null,
        potenza_kw: extractedData.potenza_kw || null,
        unit_price_eur_kwh: extractedData.unit_price_eur_kwh || null,
        quality_score: 0.95,
        tariff_hint: "auto",
      });

      if (insertError) {
        console.error("[OCR] Database insert error:", JSON.stringify(insertError));
        return new Response(
          JSON.stringify({ ok: false, error: `Database error: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
        );
      }
    } catch (dbError) {
      console.error("[OCR] Database exception:", dbError);
      return new Response(
        JSON.stringify({ ok: false, error: "Database connection error" }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    console.log("[OCR] Success!");

    return new Response(
      JSON.stringify({ ok: true, uploadId, data: extractedData }),
      { headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (error) {
    console.error("[OCR] Unexpected error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
