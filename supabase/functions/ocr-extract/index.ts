import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const uploadId = formData.get('uploadId') as string;

    if (!file || !uploadId) {
      throw new Error('File and uploadId are required');
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Read file as base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Determine mime type
    let mimeType = file.type;
    if (!mimeType) {
      const ext = file.name.toLowerCase().split('.').pop();
      mimeType = ext === 'pdf' ? 'application/pdf' : 'image/jpeg';
    }
    
    console.log(`Processing with Lovable AI (Gemini), mime: ${mimeType}`);
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analizza questa bolletta energia/gas italiana ed estrai con precisione TUTTI i dati. Sei un esperto nell'analisi di bollette energetiche italiane.

Estrai questi dati:
1. "total_cost_eur" (numero): Importo totale da pagare in euro (cerca "Totale da pagare", "Quanto devo pagare", "Importo")
2. "annual_kwh" (numero o null): Consumo annuale in kWh per LUCE. Se vedi solo consumo bimestrale (es. 575 kWh per 2 mesi), calcola annual_kwh = consumo_bimestrale * 6
3. "unit_price_eur_kwh" (numero o null): Prezzo unitario energia in €/kWh
4. "gas_smc" (numero o null): Consumo annuale GAS in Smc se presente
5. "billing_period_start" (string "YYYY-MM-DD" o null): Data inizio periodo
6. "billing_period_end" (string "YYYY-MM-DD" o null): Data fine periodo
7. "provider" (string): Nome del fornitore (es. "A2A", "Enel", "Edison")
8. "notes" (string): Note su calcoli fatti

ESEMPI:
- Se leggi "consumo 575 kWh" e "dal 01 Gennaio 2025 al 28 Febbraio 2025", allora annual_kwh = 575 * 6 = 3450
- Se leggi "267,00 euro" come importo, total_cost_eur = 267.00
- Leggi le date esatte dal documento

Rispondi SOLO con JSON valido (no markdown, no testo extra):
{
  "total_cost_eur": 267.00,
  "annual_kwh": 3450,
  "unit_price_eur_kwh": 0.25,
  "gas_smc": null,
  "billing_period_start": "2025-01-01",
  "billing_period_end": "2025-02-28",
  "provider": "A2A",
  "notes": "Consumo bimestrale 575 kWh moltiplicato x6 per annuale"
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
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (!aiContent) {
      throw new Error('Empty AI response');
    }

    console.log('Raw AI response:', aiContent);

    // Clean JSON response (remove markdown if present)
    let jsonStr = aiContent;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }
    jsonStr = jsonStr.trim();

    const parsedData = JSON.parse(jsonStr);
    
    const extractedData = {
      total_cost_eur: parsedData.total_cost_eur,
      annual_kwh: parsedData.annual_kwh,
      unit_price_eur_kwh: parsedData.unit_price_eur_kwh,
      gas_smc: parsedData.gas_smc || null,
      quality_score: 0.95,
      notes: parsedData.notes || '',
      provider: parsedData.provider || null,
      billing_period_start: parsedData.billing_period_start || null,
      billing_period_end: parsedData.billing_period_end || null
    };

    console.log('Extracted data:', extractedData);

    // Validate extracted data
    if (!extractedData.total_cost_eur || extractedData.total_cost_eur <= 0) {
      throw new Error('Impossibile estrarre l\'importo dalla bolletta');
    }
    
    if (extractedData.unit_price_eur_kwh && (extractedData.unit_price_eur_kwh < 0.05 || extractedData.unit_price_eur_kwh > 2.0)) {
      extractedData.notes += ' - Prezzo unitario fuori range normale (0.05-2.0 €/kWh)';
      extractedData.quality_score = 0.70;
    }
    
    if (extractedData.annual_kwh && (extractedData.annual_kwh < 100 || extractedData.annual_kwh > 15000)) {
      extractedData.notes += ' - Consumo annuo fuori range normale (100-15000 kWh)';
      extractedData.quality_score = 0.70;
    }

    // Get user_id from upload record
    const { data: uploadRecord } = await supabase
      .from('uploads')
      .select('user_id')
      .eq('id', uploadId)
      .single();

    // Store OCR results
    const { error: insertError } = await supabase
      .from('ocr_results')
      .insert({
        upload_id: uploadId,
        user_id: uploadRecord?.user_id,
        total_cost_eur: extractedData.total_cost_eur,
        annual_kwh: extractedData.annual_kwh,
        unit_price_eur_kwh: extractedData.unit_price_eur_kwh,
        gas_smc: extractedData.gas_smc,
        quality_score: extractedData.quality_score,
        raw_json: extractedData
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      throw new Error('Failed to save OCR results');
    }

    console.log('OCR extraction completed successfully');

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ocr-extract:', error);
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
