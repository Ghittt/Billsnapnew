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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const prompt = `Sei un classificatore per bollette italiane.
Tipi possibili:
- LUCE: contiene indicatori come POD, kWh, energia elettrica, F1/F2/F3
- GAS: contiene indicatori come PDR, Smc, mc, gas naturale
- COMBO: contiene indicatori di ENTRAMBI

Testo:
${text.substring(0, 3000)}

Rispondi SOLO JSON:
{"tipo_bolletta": "luce|gas|combo", "confid": 0.XX, "reasoning": "breve spiegazione"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.1
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) throw new Error('Empty AI response');

    const classification = JSON.parse(content);
    
    const tipo_bolletta = classification.tipo_bolletta || 'luce';
    const confid = classification.confid || 0.5;
    const finalType = confid >= 0.75 ? tipo_bolletta : 'luce';

    // Update uploads table
    await supabase.from('uploads').update({ tipo_bolletta: finalType }).eq('id', uploadId);

    // Log to ocr_debug
    await supabase.from('ocr_debug').insert({
      upload_id: uploadId,
      tipo_bolletta: finalType,
      classification_confidence: confid,
      raw_json: classification
    });

    return new Response(
      JSON.stringify({
        tipo_bolletta: finalType,
        confidence: confid,
        needs_confirmation: confid < 0.75,
        reasoning: classification.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in classify-bill:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
