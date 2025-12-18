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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'Lovable AI key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { current_annual_cost_eur, best_offer_annual_cost_eur, annual_saving_eur, provider } = await req.json();

    if (typeof annual_saving_eur !== 'number') {
      return new Response(JSON.stringify({ error: 'annual_saving_eur is required and must be a number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Generating copy message with Google Gemini...');

    const savingAmount = Math.round(annual_saving_eur);
    
    // Default fallback messages
    let defaultMessage;
    if (savingAmount >= 50) {
      defaultMessage = `Ti ho trovato un'offerta che ti fa risparmiare €${savingAmount}/anno rispetto alla tua bolletta attuale.`;
    } else {
      defaultMessage = `La tua offerta è già tra le migliori. Risparmio potenziale minimo (€${savingAmount}/anno).`;
    }

    let finalMessage = defaultMessage;

    try {
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
              role: 'system',
              content: 'Genera una sola frase chiara e diretta per comunicare il risparmio energetico. Tono professionale ma amichevole. Niente emoji. Massimo 80 caratteri.'
            },
            {
              role: 'user',
              content: savingAmount >= 50 
                ? `L'utente può risparmiare €${savingAmount} all'anno cambiando da un costo attuale di €${Math.round(current_annual_cost_eur)} a un'offerta di €${Math.round(best_offer_annual_cost_eur)}${provider ? ` con ${provider}` : ''}. Scrivi una frase di presentazione del risparmio.`
                : `L'utente ha già una buona offerta, può risparmiare solo €${savingAmount} all'anno. Scrivi una frase che lo rassicuri che la sua offerta è già competitiva.`
            }
          ]
        })
      });

      if (response.ok) {
        const aiResult = await response.json();
        const aiMessage = aiResult.choices?.[0]?.message?.content;
        
        if (aiMessage && aiMessage.trim()) {
          finalMessage = aiMessage.trim();
          console.log('AI copy generation successful');
        }
      } else {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        
        if (response.status === 429 || response.status === 402) {
          console.log('Rate limit or payment issue, using default message');
        }
      }
    } catch (aiError) {
      console.error('AI copy generation failed, using default message:', aiError);
    }

    const result = {
      message: finalMessage,
      saving_amount: savingAmount,
      is_good_offer: savingAmount < 50
    };

    console.log('Copy generation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-generate-copy function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});