// @ts-nocheck
/**
 * OCR Extract Edge Function v4.1 - Universal (Luce/Gas/Dual) + Smart Fallback
 * 
 * 1. Google Vision API: Extracts raw text.
 * 2. Google Gemini: Parses text into nested JSON for Bill Analyzer.
 * 3. Smart Fallback: Calculates annual consumption if missing.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/**
 * UNIVERSAL PROMPT for Gemini
 * Supports Luce, Gas, and Dual Fuel in a nested structure.
 */
const UNIVERSAL_PROMPT = `Sei un esperto analista di bollette energetiche.
Ti fornisco il testo grezzo di una bolletta (OCR).

Analizza il testo e restituisci un JSON STRICT che segua QUESTA STRUTTURA ESATTA.
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

TESTO OCR:
"""
{{OCR_TEXT}}
"""
`;

async function performGoogleVisionOCR(base64Data, mimeType) {
  const isPdf = mimeType === "application/pdf";
  const url = isPdf 
    ? "https://vision.googleapis.com/v1/files:annotate?key=" + geminiApiKey
    : "https://vision.googleapis.com/v1/images:annotate?key=" + geminiApiKey;

  const requestBody = {
    requests: [
      {
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        [isPdf ? "inputConfig" : "image"]: isPdf 
          ? { content: base64Data, mimeType: mimeType }
          : { content: base64Data }
      }
    ]
  };

  if (isPdf) {
    requestBody.requests[0].pages = [1, 2]; 
  }

  console.log(`[OCR] Requesting Google Vision API (${isPdf ? 'PDF Mode' : 'Image Mode'})...`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Vision API Failed: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  let fullText = "";
  
  if (isPdf) {
    const fileResponses = data.responses?.[0]?.responses || [];
    fullText = fileResponses
      .map((page) => page.fullTextAnnotation?.text || "")
      .join("\n\n--- PAGE BREAK ---\n\n");
  } else {
    fullText = data.responses?.[0]?.fullTextAnnotation?.text || "";
  }

  return fullText.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!geminiApiKey) throw new Error("Missing GEMINI_API_KEY");

    const { fileBase64, fileName, fileType, uploadId } = await req.json();
    if (!fileBase64 || !uploadId) throw new Error("Missing fileBase64 or uploadId");

    console.log(`[OCR] Processing: ${fileName} (ID: ${uploadId})`);
    
    // 1. Vision OCR
    let extractedText = "";
    try {
      extractedText = await performGoogleVisionOCR(fileBase64, fileType || "application/pdf");
      if (!extractedText) throw new Error("Vision returned empty text");
    } catch (e) {
      console.error("[OCR] Vision error:", e);
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: corsHeaders });
    }

    // 2. Gemini Parse
    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + geminiApiKey;
    const promptWithText = UNIVERSAL_PROMPT.replace("{{OCR_TEXT}}", extractedText);

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptWithText }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error(`Gemini Error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("Gemini returned no text");

    let extractedData = JSON.parse(resultText);
    console.log("[OCR] Parsed Data:", JSON.stringify(extractedData, null, 2));

    // --- INTELLIGENT FALLBACKS (The "Vision non performa" fix) ---
    // If Gemini/Vision missed the annual consumption, we calculate it from the period.
    
    // 1. Luce Fallback
    if (extractedData.bolletta_luce?.presente) {
        if (!extractedData.bolletta_luce.consumo_annuo_kwh && 
             extractedData.bolletta_luce.consumo_periodo_kwh > 0 && 
             extractedData.bolletta_luce.periodo?.mesi > 0) {
            
            const estimated = (extractedData.bolletta_luce.consumo_periodo_kwh / extractedData.bolletta_luce.periodo.mesi) * 12;
            console.log(`[OCR] Auto-calculating Annual kWh: ${estimated.toFixed(0)}`);
            extractedData.bolletta_luce.consumo_annuo_kwh = Math.round(estimated);
        }
    }

    // 2. Gas Fallback
    if (extractedData.bolletta_gas?.presente) {
        if (!extractedData.bolletta_gas.consumo_annuo_smc && 
             extractedData.bolletta_gas.consumo_periodo_smc > 0 && 
             extractedData.bolletta_gas.periodo?.mesi > 0) {
            
            const estimated = (extractedData.bolletta_gas.consumo_periodo_smc / extractedData.bolletta_gas.periodo.mesi) * 12;
            console.log(`[OCR] Auto-calculating Annual Smc: ${estimated.toFixed(0)}`);
            extractedData.bolletta_gas.consumo_annuo_smc = Math.round(estimated);
        }
    }
    // -------------------------------------------------------------

    // Determine main values for DB columns:
    let annualKwh = null, totalCost = null, provider = extractedData.provider, gasSmc = null, annualSmc = null;
    
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

    const { error: dbError } = await supabase.from("ocr_results").insert({
      upload_id: uploadId,
      provider: provider,
      total_cost_eur: totalCost,
      annual_kwh: annualKwh,
      consumo_annuo_smc: annualSmc, // Ensure this column exists in DB or is ignored
      gas_smc: annualSmc, // Legacy column support
      raw_json: extractedData, 
      quality_score: 0.99
    });

    if (dbError) {
        console.error("DB Insert Error:", dbError);
        // Do not fail the request if DB logging fails, just log it.
    }

    return new Response(JSON.stringify({ ok: true, data: extractedData }), { headers: { ...corsHeaders, "content-type": "application/json" } });

  } catch (error) {
    console.error("[OCR] Error:", error);
    try {
        const { uploadId } = await req.json().catch(() => ({}));
        if(uploadId) supabase.from("uploads").update({ ocr_status: "failed", ocr_error: error.message }).eq("id", uploadId);
    } catch {}
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: corsHeaders });
  }
});
