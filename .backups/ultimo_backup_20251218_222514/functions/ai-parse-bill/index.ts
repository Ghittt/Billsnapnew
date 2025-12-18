import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { ocr_text } = await req.json();
    if (!ocr_text) {
      return new Response(JSON.stringify({ error: 'ocr_text is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Sei un estrattore OCR rigoroso per bollette luce/gas italiane.

REGOLE CRITICHE:
- NON indovinare MAI. Se un dato non è visibile, restituisci null
- Usa punto come separatore decimale
- Valida range: total_cost_eur (50-5000), annual_kwh (200-10000), unit_price_eur_kwh (0.05-2.0)
- POD regex: ^IT[0-9A-Z]{10,25}$
- PDR regex: ^\d{14}$

Testo OCR:
${ocr_text}

Restituisci SOLO JSON valido:
{
  "total_cost_eur": float|null,
  "annual_kwh": float|null,
  "unit_price_eur_kwh": float|null,
  "pod": string|null,
  "pdr": string|null,
  "notes": string
}`;

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
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) throw new Error('Empty response from Gemini');

    const parsedData = JSON.parse(text);
    
    // Basic validation logic (simplified from original)
    const normalizeNum = (val: any) => typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
    
    const validatedData = {
      total_cost_eur: normalizeNum(parsedData.total_cost_eur),
      annual_kwh: normalizeNum(parsedData.annual_kwh),
      unit_price_eur_kwh: normalizeNum(parsedData.unit_price_eur_kwh),
      pod: parsedData.pod,
      pdr: parsedData.pdr,
      notes: parsedData.notes || 'Parsed successfully'
    };

    return new Response(JSON.stringify(validatedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-parse-bill:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
