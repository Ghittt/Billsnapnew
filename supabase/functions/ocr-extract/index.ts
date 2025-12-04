// @ts-nocheck
/**
 * OCR Extract Edge Function - Definitive Version
 * 
 * Extracts data from Italian energy bills using Google Gemini 2.0 Flash.
 * Optimized for providers: Enel, Eni, A2A, Edison, Hera, etc.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment Configuration
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || "AIzaSyCC8aktKbEn9-6g9tnd11MOEEBI4b4YIOU";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Convert ArrayBuffer to Base64 in chunks to avoid stack overflow
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

/**
 * Optimized System Prompt for Italian Energy Bills
 */
const ITALIAN_BILL_PROMPT = `
Sei un esperto analista di bollette energetiche italiane con 10 anni di esperienza.

Analizza con estrema attenzione il documento fornito (bolletta luce o gas).
Estrai TUTTI i dati disponibili con la massima precisione.

FORNITORI COMUNI: Enel Energia, Eni Plenitude, A2A Energia, Edison, Hera, Servizio Elettrico Nazionale, Acea, Iren.

CAMPI DA ESTRARRE (JSON):

1. **provider** (string): Nome esatto del fornitore. Cerca il logo o l'intestazione principale.
   Esempi: "Enel Energia", "A2A Energia", "Edison Energia"

2. **annual_kwh** (number): Consumo annuo LUCE in kWh.
   - PRIORITÀ ASSOLUTA: Cerca "Consumo Annuo Effettivo" o "Consumo Reale".
   - Se non trovi il reale, cerca "Consumo annuo stimato" o "Stima annua".
   - Se trovi solo consumo bimestrale/trimestrale, MOLTIPLICA per i periodi necessari (es. bimestrale * 6) per ottenere l'annuo.
   - Formato: 1200.5 (NON "1.200 kWh")

3. **total_cost_eur** (number): Totale da pagare QUESTA bolletta in euro.
   - Cerca: "Totale da pagare", "Importo totale", "Totale bolletta", "Totale fattura".
   - ATTENZIONE: Non confondere con "Spesa per la materia energia". Cerca il TOTALE COMPLESSIVO.
   - Formato: 85.50 (NON "€ 85,50")

4. **pod** (string): Codice POD per luce (inizia con IT).
   - Cerca: "POD", "Punto di prelievo"
   - Formato: "IT001E12345678"

5. **pdr** (string): Codice PDR per gas (solo numeri).
   - Cerca: "PDR", "Punto di riconsegna"
   - Formato: "12345678901234"

6. **gas_smc** (number): Consumo annuo GAS in Smc (Standard metri cubi).
   - Cerca: "Consumo annuo gas", "Smc annui", "Standard metri cubi"
   - Formato: 850.0

7. **costo_annuo_gas** (number): Spesa annua stimata per il gas in euro.
   - Cerca: "Spesa annua gas", "Costo annuo stimato"
   - Formato: 1200.00

8. **tariff_hint** (string): Tipo di tariffa.
   - "monoraria" se F0 o se F1=F2=F3
   - "bioraria" se F1 e F23 distinti
   - "trioraria" se F1, F2, F3 tutti distinti
   - "gas" se bolletta gas

9. **quality_score** (number): Tua valutazione della leggibilità del documento.
   - 1.0 = perfettamente leggibile
   - 0.5 = parzialmente leggibile
   - 0.0 = illeggibile

10. **unit_price_eur_kwh** (number): Prezzo medio energia in €/kWh.
    - Cerca: "Prezzo energia", "€/kWh", "PUN"
    - Formato: 0.25

11. **f1_kwh**, **f2_kwh**, **f3_kwh** (number): Consumi per fascia oraria (se presenti).

12. **potenza_kw** (number): Potenza impegnata in kW.
    - Cerca: "Potenza impegnata", "Potenza disponibile"
    - Formato: 3.0

13. **costo_annuo_luce** (number): Spesa annua stimata per la luce in euro.
    - Cerca: "Spesa annua stimata", "Costo annuo", "Totale annuo"
    - Se non presente esplicitamente, STIMALO: (Totale Bolletta / Mesi Fatturati) * 12.
    - Sii conservativo nella stima.
    - Formato: 1200.00

14. **bill_period_months** (number): Periodo di fatturazione in mesi.
    - 1 = mensile, 2 = bimestrale
    - Default: 2 (bimestrale) se non specificato

REGOLE CRITICHE:
- Restituisci SOLO un oggetto JSON valido, niente altro.
- Se un campo è assente o illeggibile, usa null.
- NON inventare dati.
- Converti sempre i numeri italiani (1.200,50) in formato JSON (1200.50).
- Se vedi "€ 45,00" → 45.00
- Se vedi "1.200 kWh" → 1200.0

ESEMPIO OUTPUT:
{
  "provider": "Enel Energia",
  "annual_kwh": 2400.0,
  "total_cost_eur": 85.50,
  "costo_annuo_luce": 513.00,
  "bill_period_months": 2,
  "pod": "IT001E12345678",
  "pdr": null,
  "gas_smc": null,
  "costo_annuo_gas": null,
  "tariff_hint": "bioraria",
  "quality_score": 0.9,
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
        JSON.stringify({ 
          ok: false, 
          error: "Server configuration error: Missing API key" 
        }),
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

    // Validate Content-Type
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Content-Type must be multipart/form-data" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Parse Form Data
    const formData = await req.formData();
    const file = formData.get("file");
    const uploadIdRaw = formData.get("uploadId");

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing or invalid 'file' field" }),
        { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    const uploadId = (uploadIdRaw?.toString() || crypto.randomUUID()).trim();
    
    console.log(`[OCR] ========================================`);
    console.log(`[OCR] Processing: ${file.name}`);
    console.log(`[OCR] Upload ID: ${uploadId}`);
    console.log(`[OCR] File Size: ${file.size} bytes`);
    console.log(`[OCR] MIME Type: ${file.type}`);
    console.log(`[OCR] ========================================`);

    // Convert file to Base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = arrayBufferToBase64(arrayBuffer);
    const mimeType = file.type || "application/pdf";

    // Gemini API Configuration (using proven gemini-2.0-flash model)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents: [{
        parts: [
          { text: ITALIAN_BILL_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64Data } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,  // Low temperature for factual extraction
        maxOutputTokens: 2048
      }
    };

    console.log(`[OCR] Calling Gemini API...`);
    const startTime = Date.now();

    // Call Gemini API
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const elapsedMs = Date.now() - startTime;
    console.log(`[OCR] Gemini responded in ${elapsedMs}ms with status ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`[OCR] Gemini API Error: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Gemini API error", 
          details: `Status ${geminiResponse.status}: ${errorText}`,
          quality_score: 0 
        }),
        { status: geminiResponse.status, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    // Parse Gemini Response
    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      console.error("[OCR] No text generated by Gemini");
      console.error("[OCR] Full response:", JSON.stringify(geminiData, null, 2));
      throw new Error("Gemini returned no text content");
    }

    console.log(`[OCR] Raw Gemini Response (${generatedText.length} chars):`);
    console.log(generatedText.substring(0, 500) + "...");

    // Extract JSON from response (remove markdown code blocks if present)
    const jsonString = generatedText
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();

    let extractedData;
    try {
      extractedData = JSON.parse(jsonString);
      console.log("[OCR] Successfully parsed JSON");
      console.log("[OCR] Extracted fields:", Object.keys(extractedData).join(", "));
    } catch (e) {
      console.error("[OCR] JSON Parse Error:", e.message);
      console.error("[OCR] Attempted to parse:", jsonString.substring(0, 200));
      throw new Error(`Failed to parse Gemini response as JSON: ${e.message}`);
    }

    // Prepare database record
    const dbRecord = {
      upload_id: uploadId,
      provider: extractedData.provider || null,
      annual_kwh: extractedData.annual_kwh || null,
      total_cost_eur: extractedData.total_cost_eur || null,
      quality_score: extractedData.quality_score || 0.5,
      tariff_hint: extractedData.tariff_hint || null,
      pod: extractedData.pod || null,
      pdr: extractedData.pdr || null,
      gas_smc: extractedData.gas_smc || null,
      costo_annuo_gas: extractedData.costo_annuo_gas || null,
      unit_price_eur_kwh: extractedData.unit_price_eur_kwh || null,
      f1_kwh: extractedData.f1_kwh || null,
      f2_kwh: extractedData.f2_kwh || null,
      f3_kwh: extractedData.f3_kwh || null,
      potenza_kw: extractedData.potenza_kw || null,
      costo_annuo_luce: extractedData.costo_annuo_luce || null,
      bill_period_months: extractedData.bill_period_months || null,
      raw_json: extractedData
    };

    // Log what we're about to save
    console.log("[OCR] Saving to database:");
    console.log(`  - Provider: ${dbRecord.provider}`);
    console.log(`  - Annual kWh: ${dbRecord.annual_kwh}`);
    console.log(`  - Total Cost: €${dbRecord.total_cost_eur}`);
    console.log(`  - POD: ${dbRecord.pod}`);
    console.log(`  - Quality: ${dbRecord.quality_score}`);

    // Insert into database
    const { data: insertedData, error: insertError } = await supabase
      .from("ocr_results")
      .insert(dbRecord)
      .select()
      .single();

    if (insertError) {
      console.error("[OCR] Database Insert Error:", insertError);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Database save failed", 
          details: insertError.message,
          quality_score: 0 
        }),
        { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
      );
    }

    console.log("[OCR] ✓ Successfully saved to database");
    console.log("[OCR] ========================================");

    // Return success response
    return new Response(
      JSON.stringify({
        ok: true,
        message: "OCR completed successfully",
        data: dbRecord,
        ...dbRecord  // Flatten for backward compatibility
      }),
      { status: 200, headers: { ...corsHeaders, "content-type": "application/json" } }
    );

  } catch (err) {
    console.error("[OCR] FATAL ERROR:", err);
    console.error("[OCR] Stack:", err.stack);
    
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: err instanceof Error ? err.message : "Unknown error",
        details: String(err),
        quality_score: 0
      }),
      { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } }
    );
  }
});
