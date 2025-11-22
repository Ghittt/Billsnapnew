import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { consumo_annuo_kwh, offers } = await req.json();

    if (!consumo_annuo_kwh || !offers || !Array.isArray(offers)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: consumo_annuo_kwh, offers' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Lovable AI key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate costs for each offer
    const enrichedOffers = offers.map(offer => ({
      ...offer,
      annual_cost: Math.round(
        consumo_annuo_kwh * (offer.unit_price_eur_kwh || 0) + 
        (offer.fixed_fee_eur_mo || 0) * 12
      )
    }));

    const prompt = `Sei un consulente esperto di energia in Italia. Analizza queste offerte energetiche e consiglia la migliore per un consumo annuo di ${consumo_annuo_kwh} kWh.

Offerte disponibili:
${JSON.stringify(enrichedOffers, null, 2)}

Considera:
1. Costo totale annuo calcolato (annual_cost)
2. Se l'offerta è green/rinnovabile (is_green)
3. Tipo di prezzo (pricing_type: fixed vs indexed)
4. Affidabilità del fornitore

Rispondi in formato JSON con questa struttura:
{
  "best_offer_id": "uuid dell'offerta migliore",
  "motivation": "Breve spiegazione (max 100 caratteri) del perché è la scelta migliore",
  "annual_saving_vs_worst": numero (risparmio annuo rispetto alla peggiore),
  "highlights": ["punto 1", "punto 2", "punto 3"]
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Sei un consulente energetico italiano che risponde sempre in JSON valido.' },
          { role: 'user', content: prompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_best_offer",
              description: "Restituisce la raccomandazione della migliore offerta energetica",
              parameters: {
                type: "object",
                properties: {
                  best_offer_id: {
                    type: "string",
                    description: "UUID dell'offerta migliore"
                  },
                  motivation: {
                    type: "string",
                    description: "Breve spiegazione (max 100 caratteri) del perché è la scelta migliore"
                  },
                  annual_saving_vs_worst: {
                    type: "number",
                    description: "Risparmio annuo rispetto alla peggiore offerta"
                  },
                  highlights: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array di 3 punti chiave"
                  }
                },
                required: ["best_offer_id", "motivation", "annual_saving_vs_worst", "highlights"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_best_offer" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to get AI recommendation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recommendation;
    try {
      recommendation = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error('Failed to parse AI response:', toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the recommended offer details
    const bestOffer = enrichedOffers.find(o => o.id === recommendation.best_offer_id);
    
    return new Response(
      JSON.stringify({
        ...recommendation,
        best_offer: bestOffer,
        consumo_annuo_kwh,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-best-offer function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
