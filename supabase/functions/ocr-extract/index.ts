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
    
    // If PDF, skip vision APIs and return a graceful fallback without errors
    if (mimeType === 'application/pdf') {
      console.log('PDF detected. Skipping vision OCR and using fallback data.');

      // Get user_id from upload record
      const { data: uploadRecord } = await supabase
        .from('uploads')
        .select('user_id')
        .eq('id', uploadId)
        .maybeSingle();

      const fallbackData = {
        total_cost_eur: 120,
        annual_kwh: 2700,
        unit_price_eur_kwh: 0.25,
        gas_smc: null,
        pod: 'IT001E12345678',
        pdr: null,
        f1_kwh: 945,  // 35% of 2700
        f2_kwh: 945,  // 35% of 2700
        f3_kwh: 810,  // 30% of 2700
        potenza_kw: 3.0,
        tariff_hint: 'trioraria',
        billing_period_start: null,
        billing_period_end: null,
        provider: 'Fornitore Corrente',
        quality_score: 0.1,
        notes: 'PDF rilevato: estrazione automatica non disponibile. Dati stimati: modifica liberamente nel form.'
      };

      const { error: insertError } = await supabase
        .from('ocr_results')
        .insert({
          upload_id: uploadId,
          user_id: uploadRecord?.user_id,
          total_cost_eur: fallbackData.total_cost_eur,
          annual_kwh: fallbackData.annual_kwh,
          unit_price_eur_kwh: fallbackData.unit_price_eur_kwh,
          gas_smc: fallbackData.gas_smc,
          pod: fallbackData.pod,
          pdr: fallbackData.pdr,
          f1_kwh: fallbackData.f1_kwh,
          f2_kwh: fallbackData.f2_kwh,
          f3_kwh: fallbackData.f3_kwh,
          potenza_kw: fallbackData.potenza_kw,
          tariff_hint: fallbackData.tariff_hint,
          billing_period_start: fallbackData.billing_period_start,
          billing_period_end: fallbackData.billing_period_end,
          provider: fallbackData.provider,
          quality_score: fallbackData.quality_score,
          raw_json: fallbackData
        });

      if (insertError) {
        console.error('Failed to insert PDF fallback OCR data:', insertError);
        // Still return fallback to avoid surfacing errors to the user
      } else {
        console.log('PDF fallback OCR data saved successfully');
      }

      return new Response(JSON.stringify(fallbackData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
                text: `Sei un estrattore OCR per bollette luce/gas italiane. Segui RIGOROSAMENTE queste regole:

REGOLE CRITICHE:
- NON indovinare MAI. Se un dato non è leggibile, restituisci null e scrivi in 'notes'
- Lavora SOLO sul contenuto della bolletta allegata
- Se il documento ha più pagine, usa la pagina 1 o, se mancano dati, la pagina 2 (indica in 'pagina_usata')
- Usa unità corrette (kWh per luce, Smc per gas)
- Restituisci SOLO JSON valido con lo schema completo
- Usa punto come separatore decimale e range realistici
- POD deve rispettare: ^IT[0-9A-Z]{10,25}$
- PDR deve rispettare: ^\\d{14}$

DATI DA ESTRARRE:
1. "total_cost_eur" (numero): Importo totale da pagare in euro (range: 50-5000)
2. "annual_kwh" (numero o null): Consumo annuale elettricità in kWh (range: 200-10000). Se vedi solo bimestre, moltiplica x6
3. "unit_price_eur_kwh" (numero o null): Prezzo unitario €/kWh (range: 0.05-2.0)
4. "gas_smc" (numero o null): Consumo annuale GAS in Smc
5. "billing_period_start" (formato "YYYY-MM-DD" o null)
6. "billing_period_end" (formato "YYYY-MM-DD" o null)
7. "provider" (stringa): Nome fornitore esatto (es. "A2A", "Enel", "Edison")
8. "pod" (stringa o null): Codice POD (IT + 10-25 caratteri alfanumerici)
9. "pdr" (stringa o null): Codice PDR (14 cifre)
10. "pagina_usata" (intero): Pagina del documento usata per l'estrazione (1 o 2)
11. "notes" (stringa): Note su calcoli o assunzioni fatte

VALIDAZIONI:
- Se total_cost_eur < 50 o > 5000: invalida e spiega in notes
- Se annual_kwh < 200 o > 10000: invalida e spiega in notes
- Se unit_price_eur_kwh < 0.05 o > 2.0: invalida e spiega in notes
- Se POD non rispetta pattern: null e spiega in notes
- Se PDR non rispetta pattern: null e spiega in notes

FORMATO RISPOSTA - Rispondi SOLO con JSON valido (nessun testo prima o dopo, no markdown):
{
  "total_cost_eur": 267.00,
  "annual_kwh": 3450,
  "unit_price_eur_kwh": 0.245,
  "gas_smc": null,
  "billing_period_start": "2025-01-01",
  "billing_period_end": "2025-02-28",
  "provider": "A2A Energia",
  "pod": "IT001E12345678901",
  "pdr": null,
  "pagina_usata": 1,
  "notes": "Consumo bimestrale 575 kWh x6 = 3450 kWh annuale stimato"
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

    // Validate POD/PDR patterns
    const podRegex = /^IT[0-9A-Z]{10,25}$/;
    const pdrRegex = /^\d{14}$/;
    
    let validatedPod = parsedData.pod || null;
    let validatedPdr = parsedData.pdr || null;
    
    if (validatedPod && !podRegex.test(validatedPod)) {
      console.warn('Invalid POD format:', validatedPod);
      validatedPod = null;
      parsedData.notes = (parsedData.notes || '') + ' - POD non valido o non trovato.';
    }
    
    if (validatedPdr && !pdrRegex.test(validatedPdr)) {
      console.warn('Invalid PDR format:', validatedPdr);
      validatedPdr = null;
      parsedData.notes = (parsedData.notes || '') + ' - PDR non valido o non trovato.';
    }

    // Extract structured fields
    const structured = extractBillFields(jsonStr, parsedData);
    
    // Normalize numbers
    const normalizeNum = (val: any, min: number, max: number, defaultVal: number | null = null): number | null => {
      if (val === null || val === undefined) return defaultVal;
      const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
      if (isNaN(n) || n < min || n > max) return defaultVal;
      return n;
    };

    const extractedData = {
      total_cost_eur: normalizeNum(parsedData.total_cost_eur, 50, 5000, structured.total_cost_eur),
      annual_kwh: normalizeNum(parsedData.annual_kwh, 200, 10000, structured.kwh_period),
      unit_price_eur_kwh: normalizeNum(parsedData.unit_price_eur_kwh, 0.05, 2.0, structured.unit_price_kwh),
      gas_smc: normalizeNum(parsedData.gas_smc, 0, 10000, structured.gas_smc),
      pod: validatedPod || structured.pod,
      pdr: validatedPdr || structured.pdr,
      f1_kwh: structured.f1_kwh,
      f2_kwh: structured.f2_kwh,
      f3_kwh: structured.f3_kwh,
      potenza_kw: structured.potenza_kw,
      tariff_hint: structured.tariff_hint,
      billing_period_start: parsedData.billing_period_start || structured.billing_period_start,
      billing_period_end: parsedData.billing_period_end || structured.billing_period_end,
      provider: parsedData.provider || structured.provider,
      pagina_usata: parsedData.pagina_usata || 1,
      quality_score: 0.95,
      notes: parsedData.notes || ''
    };

    console.log('Extracted data:', extractedData);

    // Calculate confidence score based on validations
    let confidenceAvg = 0.95;
    const validationErrors: string[] = [];

    if (!extractedData.total_cost_eur || extractedData.total_cost_eur <= 0) {
      confidenceAvg = Math.min(confidenceAvg, 0.50);
      validationErrors.push('Importo non trovato o non valido');
    }
    
    if (extractedData.unit_price_eur_kwh && (extractedData.unit_price_eur_kwh < 0.05 || extractedData.unit_price_eur_kwh > 2.0)) {
      validationErrors.push('Prezzo unitario fuori range (0.05-2.0 €/kWh)');
      confidenceAvg = Math.min(confidenceAvg, 0.70);
    }
    
    if (extractedData.annual_kwh && (extractedData.annual_kwh < 200 || extractedData.annual_kwh > 10000)) {
      validationErrors.push('Consumo annuo fuori range (200-10000 kWh)');
      confidenceAvg = Math.min(confidenceAvg, 0.70);
    }

    if (!validatedPod) {
      validationErrors.push('POD non valido o assente');
      confidenceAvg = Math.min(confidenceAvg, 0.80);
    }

    extractedData.quality_score = confidenceAvg;
    
    // Log to ocr_debug table
    try {
      await supabase.from('ocr_debug').insert({
        upload_id: uploadId,
        pagina_usata: extractedData.pagina_usata,
        raw_json: parsedData,
        confidence_avg: confidenceAvg,
        errors: validationErrors.length > 0 ? validationErrors.join('; ') : null
      });
    } catch (debugErr) {
      console.error('Failed to log to ocr_debug:', debugErr);
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
    
    // Instead of failing, return a minimal result with quality_score = 0
    // This allows the frontend to open the manual input modal
    const uploadId = (await req.formData().catch(() => new FormData())).get('uploadId') as string;
    
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get user_id from upload record if available
      const { data: uploadRecord } = await supabase
        .from('uploads')
        .select('user_id')
        .eq('id', uploadId)
        .maybeSingle();

      // Create realistic fallback data when extraction fails
      const fallbackData = {
        total_cost_eur: 120,
        annual_kwh: 2700,
        unit_price_eur_kwh: 0.25,
        gas_smc: null,
        pod: 'IT001E12345678',
        pdr: null,
        f1_kwh: 945,  // 35% of 2700
        f2_kwh: 945,  // 35% of 2700
        f3_kwh: 810,  // 30% of 2700
        potenza_kw: 3.0,
        tariff_hint: 'trioraria',
        billing_period_start: null,
        billing_period_end: null,
        provider: 'Fornitore Corrente',
        quality_score: 0.1,
        notes: 'Dati di esempio - OCR non riuscito. Modifica i valori nel form.'
      };

      // Store minimal result in database
      if (uploadId) {
        const { error: insertError } = await supabase
          .from('ocr_results')
          .insert({
            upload_id: uploadId,
            user_id: uploadRecord?.user_id,
            total_cost_eur: fallbackData.total_cost_eur,
            annual_kwh: fallbackData.annual_kwh,
            unit_price_eur_kwh: fallbackData.unit_price_eur_kwh,
            gas_smc: fallbackData.gas_smc,
            pod: fallbackData.pod,
            pdr: fallbackData.pdr,
            f1_kwh: fallbackData.f1_kwh,
            f2_kwh: fallbackData.f2_kwh,
            f3_kwh: fallbackData.f3_kwh,
            potenza_kw: fallbackData.potenza_kw,
            tariff_hint: fallbackData.tariff_hint,
            billing_period_start: fallbackData.billing_period_start,
            billing_period_end: fallbackData.billing_period_end,
            provider: fallbackData.provider,
            quality_score: fallbackData.quality_score,
            raw_json: fallbackData
          });
        
        if (insertError) {
          console.error('Failed to insert fallback OCR data:', insertError);
          throw new Error(`Failed to save fallback data: ${insertError.message}`);
        }
        
        console.log('Fallback OCR data saved successfully');
      }

      // Return success with quality_score = 0 to trigger manual input
      return new Response(JSON.stringify(fallbackData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });

    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      // Last resort: return error
      return new Response(
        JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined,
          quality_score: 0
        }), 
        {
          status: 422,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  }
});
