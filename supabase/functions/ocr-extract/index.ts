import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to base64-encode ArrayBuffer using Deno std to avoid call stack issues
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return b64encode(bytes.buffer);
}

// Helper functions for field extraction
function grab(re: RegExp, s: string): string | null {
  const m = s.match(re);
  return m && (m[1] || m[0]) ? (m[1] || m[0]).trim() : null;
}

function toNum(x: string | null, d = 0): number {
  if (!x) return d;
  const n = Number(x.replace(',', '.').replace(/[^0-9.]/g, ''));
  return isFinite(n) ? n : d;
}

function extractBillFields(text: string, aiParsed: any) {
  const s = text.replace(/\s+/g, ' ');
  
  // Extract POD/PDR
  const pod = grab(/POD[:\s]*([A-Z0-9]{14,})/i, s);
  const pdr = grab(/PDR[:\s]*([0-9]{14,})/i, s);
  
  // Extract F1/F2/F3 consumption
  const f1 = toNum(grab(/F1[^0-9]{0,10}([0-9.,]{1,})(?:\s?kWh)/i, s));
  const f2 = toNum(grab(/F2[^0-9]{0,10}([0-9.,]{1,})(?:\s?kWh)/i, s));
  const f3 = toNum(grab(/F3[^0-9]{0,10}([0-9.,]{1,})(?:\s?kWh)/i, s));
  
  // Total consumption
  const kwh_period = toNum(grab(/Consumi(?:\s+totali)?[^0-9]{0,10}([0-9.,]+)\s?kWh/i, s), f1 + f2 + f3);
  
  // Power
  const potenza = toNum(grab(/Potenza\s+(?:impegnata|contrattuale)[^\d]{0,10}([0-9.,]+)/i, s), 3.0);
  
  // Tariff type
  const tariff = grab(/Mono(?:raria)|Bioraria|Triofascia|F1-F2-F3/i, s);
  
  // Billing period from AI
  const periodStart = aiParsed?.billing_period_start || null;
  const periodEnd = aiParsed?.billing_period_end || null;
  const provider = aiParsed?.provider || grab(/Fornitore[:\s]*([A-Za-z0-9\s]+)/i, s);
  
  return {
    pod,
    pdr,
    f1_kwh: f1 || null,
    f2_kwh: f2 || null,
    f3_kwh: f3 || null,
    kwh_period: kwh_period || aiParsed?.annual_kwh || 2700,
    potenza_kw: potenza,
    tariff_hint: tariff || 'monoraria',
    billing_period_start: periodStart,
    billing_period_end: periodEnd,
    provider,
    total_cost_eur: aiParsed?.total_cost_eur || null,
    unit_price_kwh: aiParsed?.unit_price_eur_kwh || null,
    gas_smc: aiParsed?.gas_smc || null
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const uploadId = formData.get('uploadId') as string;

    if (!file || !uploadId) {
      throw new Error('File and uploadId are required');
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Read file and convert to base64 safely
    const arrayBuffer = await file.arrayBuffer();
    console.log('File loaded into memory, converting to base64...');
    
    const base64 = arrayBufferToBase64(arrayBuffer);
    console.log('Base64 conversion completed');
    
    // Determine mime type
    let mimeType = file.type;
    if (!mimeType) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'pdf') {
        mimeType = 'application/pdf';
      } else if (ext === 'png') {
        mimeType = 'image/png';
      } else if (ext === 'jpg' || ext === 'jpeg') {
        mimeType = 'image/jpeg';
      } else {
        mimeType = 'image/jpeg'; // default
      }
    }
    
    console.log(`Calling OpenAI Vision API with mime type: ${mimeType}`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analizza questa bolletta energia/gas italiana ed estrai con precisione TUTTI i dati numerici visibili. Sei un esperto nell'estrazione dati da bollette energetiche italiane.

DATI DA ESTRARRE:
1. "total_cost_eur" (numero): Importo totale da pagare in euro. Cerca "Totale da pagare", "Quanto devo pagare", "Importo totale", il numero più grande evidenziato
2. "annual_kwh" (numero o null): Consumo annuale elettricità in kWh. Se vedi solo consumo di 2 mesi (bimestrale), moltiplica x6 per ottenere l'annuale
3. "unit_price_eur_kwh" (numero o null): Prezzo unitario energia €/kWh (cerca nelle voci di dettaglio)
4. "gas_smc" (numero o null): Consumo annuale GAS in Smc (Standard metri cubi), se presente nella bolletta
5. "billing_period_start" (formato "YYYY-MM-DD" o null): Data inizio periodo fatturazione
6. "billing_period_end" (formato "YYYY-MM-DD" o null): Data fine periodo fatturazione
7. "provider" (stringa): Nome fornitore (es. "A2A Energia", "Enel", "Edison", "Sorgenia")
8. "notes" (stringa): Note su calcoli o assunzioni fatte

ISTRUZIONI CRITICHE:
- Se la bolletta copre 2 mesi (es. "dal 01 Gennaio al 28 Febbraio") e vedi "consumo 575 kWh", calcola: annual_kwh = 575 * 6 = 3450
- Se vedi "267,00 euro", scrivi 267.00 (usa punto decimale)
- Date nel formato YYYY-MM-DD (es. "21 Marzo 2025" diventa "2025-03-21")
- Se un dato non è visibile, metti null e spiega in notes
- Leggi attentamente tutti i numeri evidenziati nella bolletta

FORMATO RISPOSTA - Rispondi SOLO con JSON valido (nessun testo prima o dopo, no markdown):
{
  "total_cost_eur": 267.00,
  "annual_kwh": 3450,
  "unit_price_eur_kwh": 0.245,
  "gas_smc": null,
  "billing_period_start": "2025-01-01",
  "billing_period_end": "2025-02-28",
  "provider": "A2A Energia",
  "notes": "Consumo bimestrale 575 kWh moltiplicato per 6 per ottenere stima annuale"
}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      })
    });

    let aiContent: string | undefined;

    try {
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }
      const aiResult = await response.json();
      aiContent = aiResult.choices?.[0]?.message?.content?.trim();
      if (!aiContent) throw new Error('Empty AI response from OpenAI');
      console.log('Raw OpenAI response:', aiContent);
    } catch (openAiErr) {
      console.error('OpenAI Vision failed. Falling back to Lovable AI Gemini:', openAiErr);
      if (!lovableApiKey) throw openAiErr;

      const geminiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-pro',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Esegui lo stesso compito di estrazione dati della bolletta come sopra. Rispondi SOLO con JSON valido.' },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } }
              ]
            }
          ]
        })
      });

      if (!geminiResp.ok) {
        const t = await geminiResp.text();
        throw new Error(`Gemini fallback error: ${geminiResp.status} - ${t}`);
      }
      const geminiData = await geminiResp.json();
      aiContent = geminiData.choices?.[0]?.message?.content?.trim();
      if (!aiContent) throw new Error('Empty response from Gemini fallback');
      console.log('Raw Gemini response:', aiContent);
    }

    // Clean JSON response (remove markdown if present)
    let jsonStr = aiContent as string;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    if (jsonStr.includes('```')) {
      jsonStr = jsonStr.replace(/```\n?/g, '');
    }
    jsonStr = jsonStr.trim();

    let parsedData: any;
    try {
      parsedData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse JSON:', jsonStr);
      throw new Error('Invalid JSON response from OCR AI');
    }

    // Extract structured fields
    const structured = extractBillFields(jsonStr, parsedData);
    
    const extractedData = {
      total_cost_eur: structured.total_cost_eur,
      annual_kwh: structured.kwh_period,
      unit_price_eur_kwh: structured.unit_price_kwh,
      gas_smc: structured.gas_smc,
      pod: structured.pod,
      pdr: structured.pdr,
      f1_kwh: structured.f1_kwh,
      f2_kwh: structured.f2_kwh,
      f3_kwh: structured.f3_kwh,
      potenza_kw: structured.potenza_kw,
      tariff_hint: structured.tariff_hint,
      billing_period_start: structured.billing_period_start,
      billing_period_end: structured.billing_period_end,
      provider: structured.provider,
      quality_score: 0.95,
      notes: parsedData.notes || ''
    };

    console.log('Extracted data:', extractedData);

    // Validate extracted data
    if (!extractedData.total_cost_eur || extractedData.total_cost_eur <= 0) {
      extractedData.quality_score = 0.50;
      extractedData.notes = (extractedData.notes || '') + ' - ATTENZIONE: Importo non trovato o non valido. Verifica manualmente.';
    }
    
    if (extractedData.unit_price_eur_kwh && (extractedData.unit_price_eur_kwh < 0.05 || extractedData.unit_price_eur_kwh > 2.0)) {
      extractedData.notes = (extractedData.notes || '') + ' - Prezzo unitario fuori range normale (0.05-2.0 €/kWh).';
      extractedData.quality_score = Math.min(extractedData.quality_score, 0.70);
    }
    
    if (extractedData.annual_kwh && (extractedData.annual_kwh < 100 || extractedData.annual_kwh > 15000)) {
      extractedData.notes = (extractedData.notes || '') + ' - Consumo annuo fuori range tipico (100-15000 kWh).';
      extractedData.quality_score = Math.min(extractedData.quality_score, 0.70);
    }

    // Get user_id from upload record
    const { data: uploadRecord } = await supabase
      .from('uploads')
      .select('user_id')
      .eq('id', uploadId)
      .maybeSingle();

    // Store OCR results in database
    const { error: insertError } = await supabase
      .from('ocr_results')
      .insert({
        upload_id: uploadId,
        user_id: uploadRecord?.user_id,
        total_cost_eur: extractedData.total_cost_eur,
        annual_kwh: extractedData.annual_kwh,
        unit_price_eur_kwh: extractedData.unit_price_eur_kwh,
        gas_smc: extractedData.gas_smc,
        pod: extractedData.pod,
        pdr: extractedData.pdr,
        f1_kwh: extractedData.f1_kwh,
        f2_kwh: extractedData.f2_kwh,
        f3_kwh: extractedData.f3_kwh,
        potenza_kw: extractedData.potenza_kw,
        tariff_hint: extractedData.tariff_hint,
        billing_period_start: extractedData.billing_period_start,
        billing_period_end: extractedData.billing_period_end,
        provider: extractedData.provider,
        quality_score: extractedData.quality_score,
        raw_json: extractedData
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save OCR results to database');
    }

    console.log('OCR extraction completed successfully');

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ocr-extract function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
