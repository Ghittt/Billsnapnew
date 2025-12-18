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

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
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

Rispondi SOLO con un JSON valido con questa struttura:
{
  "best_offer_id": "uuid dell'offerta migliore",
  "motivation": "Breve spiegazione (max 100 caratteri) del perché è la scelta migliore",
  "annual_saving_vs_worst": numero (risparmio annuo rispetto alla peggiore),
  "highlights": ["punto 1", "punto 2", "punto 3"]
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
      console.error('Gemini API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to get AI recommendation', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Empty response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let recommendation;
    try {
      recommendation = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse AI response:', text);
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
