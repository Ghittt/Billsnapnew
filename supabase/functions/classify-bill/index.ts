import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, uploadId } = await req.json();
    
    if (!text || !uploadId) {
      throw new Error('Missing required parameters: text and uploadId');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Classifying bill for uploadId: ${uploadId}`);

    // Call OpenAI for classification
    const systemPrompt = `Sei un classificatore per bollette italiane. Riconosci il tipo di bolletta analizzando il testo.

Tipi possibili:
- LUCE: contiene indicatori come POD, kWh, energia elettrica, F1/F2/F3, potenza impegnata
- GAS: contiene indicatori come PDR, Smc, mc, gas naturale, metano
- COMBO: contiene indicatori di ENTRAMBI luce e gas (sia POD che PDR)

Rispondi SOLO con JSON valido nel formato:
{"tipo_bolletta": "luce|gas|combo", "confid": 0.XX, "reasoning": "breve spiegazione"}

Non inventare dati. Se non sei sicuro, indica una confidenza bassa.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Classifica questa bolletta:\n\n${text.substring(0, 3000)}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    const classification = JSON.parse(aiResponse);

    console.log('Classification result:', classification);

    // Validate response
    const tipo_bolletta = classification.tipo_bolletta || 'luce';
    const confid = parseFloat(classification.confid) || 0.5;
    const reasoning = classification.reasoning || '';

    // Apply threshold: if confidence < 0.75, default to 'luce'
    const finalType = confid >= 0.75 ? tipo_bolletta : 'luce';
    const needsConfirmation = confid < 0.75;

    // Update uploads table
    const { error: updateError } = await supabase
      .from('uploads')
      .update({ tipo_bolletta: finalType })
      .eq('id', uploadId);

    if (updateError) {
      console.error('Error updating upload:', updateError);
    }

    // Log to ocr_debug
    const { error: logError } = await supabase
      .from('ocr_debug')
      .insert({
        upload_id: uploadId,
        tipo_bolletta: finalType,
        classification_confidence: confid,
        raw_json: {
          classification: classification,
          needs_confirmation: needsConfirmation,
          original_type: tipo_bolletta,
          reasoning: reasoning
        }
      });

    if (logError) {
      console.error('Error logging to ocr_debug:', logError);
    }

    return new Response(
      JSON.stringify({
        tipo_bolletta: finalType,
        confidence: confid,
        needs_confirmation: needsConfirmation,
        reasoning: reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in classify-bill:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        tipo_bolletta: 'luce',
        confidence: 0,
        needs_confirmation: true
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
