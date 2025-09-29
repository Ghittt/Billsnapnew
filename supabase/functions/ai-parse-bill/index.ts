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
            content: 'Sei un parser rigoroso di bollette luce/gas in Italia. Estrai e valida i campi numerici. Restituisci SOLO JSON valido con le chiavi specificate.'
          },
          {
            role: 'user',
            content: `Fornisco testo OCR della bolletta. Restituisci SOLO JSON valido con chiavi:
            { 
              "total_cost_eur": float, 
              "annual_kwh": float|null, 
              "unit_price_eur_kwh": float|null, 
              "notes": string 
            }
            
            Se un campo manca, stima usando i dati presenti e descrivi la logica in notes. Nessun testo fuori dal JSON.
            
            Testo OCR della bolletta:
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
      
      // Validate the structure
      const validatedData = {
        total_cost_eur: typeof parsedData.total_cost_eur === 'number' ? parsedData.total_cost_eur : null,
        annual_kwh: typeof parsedData.annual_kwh === 'number' ? parsedData.annual_kwh : null,
        unit_price_eur_kwh: typeof parsedData.unit_price_eur_kwh === 'number' ? parsedData.unit_price_eur_kwh : null,
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