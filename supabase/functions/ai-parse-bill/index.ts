import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ocr_text } = await req.json();

    if (!ocr_text) {
      return new Response(JSON.stringify({ error: 'ocr_text is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Parsing bill with OpenAI...');

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
            content: `Sei un estrattore OCR rigoroso per bollette luce/gas italiane.

REGOLE CRITICHE:
- NON indovinare MAI. Se un dato non è visibile, restituisci null
- Usa punto come separatore decimale
- Valida range: total_cost_eur (50-5000), annual_kwh (200-10000), unit_price_eur_kwh (0.05-2.0)
- POD regex: ^IT[0-9A-Z]{10,25}$
- PDR regex: ^\\d{14}$
- Se i range non sono rispettati, restituisci null e spiega in notes

Restituisci SOLO JSON valido (no markdown, no testo extra):
{
  "total_cost_eur": float,
  "annual_kwh": float|null,
  "unit_price_eur_kwh": float|null,
  "pod": string|null,
  "pdr": string|null,
  "notes": string
}`
          },
          {
            role: 'user',
            content: `Testo OCR della bolletta:
            ${ocr_text}`
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return new Response(JSON.stringify({ 
        error: `OpenAI API error: ${response.status}`,
        details: errorText 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const aiContent = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (!aiContent) {
      return new Response(JSON.stringify({ error: 'Empty response from OpenAI' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const parsedData = JSON.parse(aiContent);
      
      // Validate POD/PDR patterns
      const podRegex = /^IT[0-9A-Z]{10,25}$/;
      const pdrRegex = /^\d{14}$/;
      
      let validatedPod = parsedData.pod || null;
      let validatedPdr = parsedData.pdr || null;
      
      if (validatedPod && !podRegex.test(validatedPod)) {
        console.warn('Invalid POD format:', validatedPod);
        validatedPod = null;
      }
      
      if (validatedPdr && !pdrRegex.test(validatedPdr)) {
        console.warn('Invalid PDR format:', validatedPdr);
        validatedPdr = null;
      }

      // Normalize and validate numbers
      const normalizeNum = (val: any, min: number, max: number): number | null => {
        if (val === null || val === undefined) return null;
        const n = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
        if (isNaN(n) || n < min || n > max) return null;
        return n;
      };

      const validatedData = {
        total_cost_eur: normalizeNum(parsedData.total_cost_eur, 50, 5000),
        annual_kwh: normalizeNum(parsedData.annual_kwh, 200, 10000),
        unit_price_eur_kwh: normalizeNum(parsedData.unit_price_eur_kwh, 0.05, 2.0),
        pod: validatedPod,
        pdr: validatedPdr,
        notes: typeof parsedData.notes === 'string' ? parsedData.notes : 'Parsed successfully'
      };

      console.log('Bill parsing completed successfully');
      
      return new Response(JSON.stringify(validatedData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON response from AI',
        raw_response: aiContent 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in ai-parse-bill function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});