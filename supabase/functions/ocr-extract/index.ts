import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const uploadId = formData.get('uploadId') as string;

    if (!file || !uploadId) {
      throw new Error('File and uploadId are required');
    }

    console.log(`Processing file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Simulate OCR text extraction (in real implementation, use Google Vision/Azure OCR)
    const mockOcrText = `
    BOLLETTA ENERGIA ELETTRICA
    Periodo: Gen 2024 - Dic 2024
    Totale da pagare: € ${file.name.includes('alta') ? '1680,50' : '1200,00'}
    Consumo annuo: ${file.name.includes('alta') ? '3500' : '2400'} kWh
    Prezzo energia: € ${file.name.includes('alta') ? '0,25' : '0,22'}/kWh
    Quota fissa: € 8,50/mese
    `;

    let extractedData;

    // Use OpenAI for AI-powered parsing if available
    if (openaiApiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Sei un parser rigoroso di bollette luce/gas in Italia. Estrai e valida i campi numerici. Rispondi SOLO con JSON valido.'
              },
              {
                role: 'user',
                content: `Fornisco testo OCR della bolletta. Restituisci SOLO JSON valido con chiavi: { "total_cost_eur": float, "annual_kwh": float|null, "unit_price_eur_kwh": float|null, "notes": string }. Se un campo manca, stima usando i dati presenti e descrivi la logica in notes. Nessun testo fuori dal JSON.\n\nTesto OCR:\n${mockOcrText}`
              }
            ],
            max_tokens: 500,
            temperature: 0.1
          })
        });

        if (response.ok) {
          const aiResult = await response.json();
          const aiContent = aiResult.choices?.[0]?.message?.content?.trim();
          
          if (aiContent) {
            try {
              const parsedData = JSON.parse(aiContent);
              extractedData = {
                total_cost_eur: parsedData.total_cost_eur,
                annual_kwh: parsedData.annual_kwh,
                unit_price_eur_kwh: parsedData.unit_price_eur_kwh,
                gas_smc: null,
                quality_score: 0.95,
                notes: parsedData.notes
              };
              console.log('OpenAI parsing successful:', extractedData);
            } catch (parseError) {
              console.error('Failed to parse AI response:', parseError);
              throw new Error('Invalid AI response format');
            }
          } else {
            throw new Error('Empty AI response');
          }
        } else {
          const errorText = await response.text();
          console.error('OpenAI API error:', response.status, errorText);
          throw new Error(`OpenAI API error: ${response.status}`);
        }
      } catch (aiError) {
        console.error('AI parsing failed, using fallback:', aiError);
        // Fallback to mock data
        extractedData = {
          total_cost_eur: file.name.includes('alta') ? 1680.50 : 1200.00,
          annual_kwh: file.name.includes('alta') ? 3500 : 2400,
          unit_price_eur_kwh: file.name.includes('alta') ? 0.25 : 0.22,
          gas_smc: null,
          quality_score: 0.80,
          notes: 'Dati stimati - parsing AI non disponibile'
        };
      }
    } else {
      // Fallback if no OpenAI key
      extractedData = {
        total_cost_eur: file.name.includes('alta') ? 1680.50 : 1200.00,
        annual_kwh: file.name.includes('alta') ? 3500 : 2400,
        unit_price_eur_kwh: file.name.includes('alta') ? 0.25 : 0.22,
        gas_smc: null,
        quality_score: 0.80,
        notes: 'Dati stimati - OpenAI non configurato'
      };
    }

    // Validate extracted data
    if (extractedData.unit_price_eur_kwh && (extractedData.unit_price_eur_kwh < 0.05 || extractedData.unit_price_eur_kwh > 2.0)) {
      extractedData.notes = (extractedData.notes || '') + ' - Prezzo unitario fuori range normale';
    }
    if (extractedData.annual_kwh && (extractedData.annual_kwh < 100 || extractedData.annual_kwh > 10000)) {
      extractedData.notes = (extractedData.notes || '') + ' - Consumo annuo fuori range normale';
    }

    // Get user_id from the upload record
    const { data: uploadRecord } = await supabase
      .from('uploads')
      .select('user_id')
      .eq('id', uploadId)
      .single();

    // Store the OCR results in the database
    const { data: insertResult, error: insertError } = await supabase
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
      return new Response(JSON.stringify({ error: 'Failed to save OCR results' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('OCR extraction completed successfully');

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ocr-extract function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});