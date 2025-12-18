// @ts-nocheck
/**
 * OCR Extract Edge Function v5.7 - Gemini 2.0 Flash Experimental (Multi-File)
 *
 * FIX: Reverting to gemini-2.0-flash-exp as per user request/performance.
 * Supports single file (legacy) or multiple files (batch).
 * Converts all inputs into Gemini inline_data parts.
 *
 * INTEGRATION NOTE: Uses GEMINI_API_KEY from Supabase Secrets.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
// Fallback logic for keys
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

/**
 * MULTIMODAL PROMPT for Gemini
 * Directly instructs the model to look at the image/pdf.
 */
const MULTIMODAL_PROMPT = `Sei un esperto analista di bollette energetiche.
Analizza VISIVAMENTE i documenti forniti (PDF o Immagini della bolletta - Fronte/Retro o pagine multiple).

Estrai i dati e restituisci un JSON STRICT che segua QUESTA STRUTTURA ESATTA.
Non inventare dati. Se mancano, usa null.

STRUTTURA JSON RICHIESTA:
{
  "tipo_fornitura": "luce" | "gas" | "luce+gas" | "altro",
  "provider": "Nome fornitore",
  "data_emissione_bolletta": "YYYY-MM-DD",
  
  "bolletta_luce": {
    "presente": boolean,
    "pod": "IT...",
    "potenza_kw": number,
    "consumo_annuo_kwh": number (cerca "consumo annuo stimato" o calcola),
    "consumo_periodo_kwh": number (consumo fatturato in questo periodo),
    "periodo": {
        "data_inizio": "YYYY-MM-DD",
        "data_fine": "YYYY-MM-DD",
        "mesi": number
    },
    "totale_periodo_euro": number,
    "consumi_fasce": {
       "f1": number,
       "f2": number, 
       "f3": number
    }
  },

  "bolletta_gas": {
    "presente": boolean,
    "pdr": "numero...",
    "consumo_annuo_smc": number (cerca "consumo annuo stimato" o calcola),
    "consumo_periodo_smc": number,
    "periodo": {
        "data_inizio": "YYYY-MM-DD",
        "data_fine": "YYYY-MM-DD",
        "mesi": number
    },
    "totale_periodo_euro": number
  }
}

REGOLE CRITICHE:
1. Se la bolletta è SOLO LUCE: imposta bolletta_gas.presente = false.
2. Se la bolletta è SOLO GAS: imposta bolletta_luce.presente = false e tipo_fornitura = "gas".
3. Se è DUAL (entrambi): entrambi true e tipo_fornitura = "luce+gas".
4. "consumo_annuo" è il dato più importante. Se non c'è scritto esplicitamente "Annuo", stimalo: (consumo_periodo / mesi_periodo) * 12.
5. NON ARROTONDARE GLI IMPORTI.
6. Ignora pubblicità o dati non pertinenti alla fornitura.
`;

// PRIORITY-BASED CONSUMPTION CALCULATION
function computeConsumptionYear(data: {
  consumption_year_raw: number | null;
  consumption_period: number | null;
  period_months: number | null;
}): { value: number | null; was_estimated: boolean; source: string } {
  // RULE 1: Real data wins
  if (data.consumption_year_raw && data.consumption_year_raw > 0) {
    return { value: data.consumption_year_raw, was_estimated: false, source: "REAL" };
  }
  
  // RULE 2: Calculate if we have period data
  if (data.consumption_period && data.consumption_period > 0 &&
      data.period_months && data.period_months > 0) {
    const estimated = Math.round((data.consumption_period / data.period_months) * 12);
    return { value: estimated, was_estimated: true, source: "CALCULATED" };
  }
  
  // RULE 3: Missing data
  return { value: null, was_estimated: false, source: "MISSING" };
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY");

    const { fileBase64, fileName, fileType, uploadId, files } = await req.json();
    
    // Validate imput: support either single file (legacy) or multiple files (new)
    if (!uploadId) throw new Error("Missing uploadId");
    
    let parts = [{ text: MULTIMODAL_PROMPT }];

    if (files && Array.isArray(files) && files.length > 0) {
        console.log(`[OCR] Processing BATCH of ${files.length} files (ID: ${uploadId})`);
        
        // Add each file as an inline_data part
        files.forEach((f, idx) => {
            parts.push({
                inline_data: {
                    mime_type: f.mimeType || "application/pdf",
                    data: f.data
                }
            });
        });
    } else if (fileBase64) {
        console.log(`[OCR] Processing SINGLE file: ${fileName} (ID: ${uploadId})`);
        const mimeType = fileType || "application/pdf";
        parts.push({
            inline_data: {
                mime_type: mimeType,
                data: fileBase64
            }
        });
    } else {
        throw new Error("Missing file data (fileBase64 or files array)");
    }

    // Use Gemini 2.0 Flash Experimental (Proven compatibility)
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + geminiApiKey;
    
    const requestBody = {
      contents: [{ parts: parts }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    console.log(`[OCR] Sending ${parts.length - 1} images/files to Gemini 2.0 Flash Exp...`);

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      throw new Error(`Gemini Multimodal Error: ${geminiResponse.status} - ${errText}`);
    }

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      console.error("Gemini Response Dump:", JSON.stringify(geminiData));
      throw new Error("Gemini returned no text/candidates");
    }

    let extractedData;
    try {
        extractedData = JSON.parse(resultText);
    } catch (e) {
        console.error("JSON Parse Error:", resultText);
        throw new Error("Gemini returned invalid JSON");
    }


    // PRIORITY-BASED CONSUMPTION CALCULATION (replaces old fallbacks)
    let luceWasEstimated = false;
    let gasWasEstimated = false;
    
    if (extractedData.bolletta_luce?.presente) {
      const result = computeConsumptionYear({
        consumption_year_raw: extractedData.bolletta_luce.consumo_annuo_kwh,
        consumption_period: extractedData.bolletta_luce.consumo_periodo_kwh,
        period_months: extractedData.bolletta_luce.periodo?.mesi
      });
      
      luceWasEstimated = result.was_estimated;
      console.log(`[OCR] LUCE consumption_year: ${result.value} (${result.source})`);
      
      if (result.value !== null) {
        extractedData.bolletta_luce.consumo_annuo_kwh = result.value;
      }
    }
    
    if (extractedData.bolletta_gas?.presente) {
      const result = computeConsumptionYear({
        consumption_year_raw: extractedData.bolletta_gas.consumo_annuo_smc,
        consumption_period: extractedData.bolletta_gas.consumo_periodo_smc,
        period_months: extractedData.bolletta_gas.periodo?.mesi
      });
      
      gasWasEstimated = result.was_estimated;
      console.log(`[OCR] GAS consumption_year: ${result.value} (${result.source})`);
      
      if (result.value !== null) {
        extractedData.bolletta_gas.consumo_annuo_smc = result.value;
      }
    }
    // -------------------------------------------------------------

    // Determine main values for DB columns:
    let annualKwh = null, totalCost = null, provider = extractedData.provider, annualSmc = null;
    
    if (extractedData.bolletta_luce?.presente) {
        annualKwh = extractedData.bolletta_luce.consumo_annuo_kwh;
        if (!totalCost) totalCost = extractedData.bolletta_luce.totale_periodo_euro;
    } 
    
    if (extractedData.bolletta_gas?.presente) {
        annualSmc = extractedData.bolletta_gas.consumo_annuo_smc;
        if (!totalCost && extractedData.bolletta_gas.totale_periodo_euro) {
            totalCost = extractedData.bolletta_gas.totale_periodo_euro;
        } else if (totalCost && extractedData.bolletta_gas.totale_periodo_euro) {
            // If both present (Dual), sum the costs for the summary
            totalCost += extractedData.bolletta_gas.totale_periodo_euro;
        }
    }

    // Insert into DB
    const { error: dbError } = await supabase.from("ocr_results").insert({
      upload_id: uploadId,
      provider: provider,
      total_cost_eur: totalCost,
      annual_kwh: annualKwh,
      consumo_annuo_smc: annualSmc, 
      gas_smc: annualSmc, // Legacy 
      raw_json: extractedData, 
      quality_score: (provider && (annualKwh || annualSmc) && totalCost) ? 1.0 : 0.3 // Dynamic quality score
    });

    if (dbError) {
        console.error("DB Insert Error:", dbError);
    }

    // BILLNORMALIZED: Save canonical extraction
    const normalized = {
      upload_id: uploadId,
      commodity: extractedData.tipo_fornitura === "luce" ? "LUCE" 
               : extractedData.tipo_fornitura === "gas" ? "GAS"
               : extractedData.tipo_fornitura === "luce+gas" ? "DUAL" : null,
      period_months: extractedData.bolletta_luce?.periodo?.mesi 
                  || extractedData.bolletta_gas?.periodo?.mesi || null,
      period_start: extractedData.bolletta_luce?.periodo?.data_inizio 
                 || extractedData.bolletta_gas?.periodo?.data_inizio || null,
      period_end: extractedData.bolletta_luce?.periodo?.data_fine 
               || extractedData.bolletta_gas?.periodo?.data_fine || null,
      consumption_period: extractedData.bolletta_luce?.consumo_periodo_kwh 
                       || extractedData.bolletta_gas?.consumo_periodo_smc || null,
      consumption_year: extractedData.bolletta_luce?.consumo_annuo_kwh 
                     || extractedData.bolletta_gas?.consumo_annuo_smc || null,
      consumption_unit: extractedData.bolletta_luce?.presente ? "KWH" 
                     : extractedData.bolletta_gas?.presente ? "SMC" : null,
      total_due: extractedData.bolletta_luce?.totale_periodo_euro 
              || extractedData.bolletta_gas?.totale_periodo_euro || null,
      supplier: extractedData.provider || null,
      pod: extractedData.bolletta_luce?.pod || null,
      pdr: extractedData.bolletta_gas?.pdr || null,
      confidence: (provider && (annualKwh || annualSmc) && totalCost) ? 1.0 : 0.3,
      consumption_year_was_estimated: luceWasEstimated || gasWasEstimated,
      source_fields: {},
      raw_ocr_response: extractedData
    };

    const { error: normalizedError } = await supabase.from("bill_extractions").insert(normalized);
    if (normalizedError) {
      console.error("[OCR] BillNormalized insert error:", normalizedError);
    } else {
      console.log("[OCR] BillNormalized saved for upload:", uploadId);
    }

    return new Response(JSON.stringify({ ok: true, data: extractedData }), { headers: { ...corsHeaders, "content-type": "application/json" } });

  } catch (error) {
    console.error("[OCR] Fatal Error:", error);
    
    // Update upload status to failed if possible
    try {
        const { uploadId } = await req.json().catch(() => ({}));
        if(uploadId) {
             await supabase.from("uploads")
                .update({ ocr_status: "failed", ocr_error: error.message })
                .eq("id", uploadId);
        }
    } catch {}

    // Uniform error response as requested
    return new Response(JSON.stringify({ 
        ok: false, 
        error: "Errore da Gemini", 
        details: error.message, 
        quality_score: 0 
    }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});
