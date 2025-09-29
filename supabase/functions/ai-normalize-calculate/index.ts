import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { total_cost_eur, annual_kwh, unit_price_eur_kwh, fixed_fee_eur_mo } = await req.json();

    if (typeof total_cost_eur !== 'number') {
      return new Response(JSON.stringify({ error: 'total_cost_eur is required and must be a number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Normalizing and calculating savings...');

    let normalizedData = {
      current_annual_cost_eur: total_cost_eur,
      annual_kwh: annual_kwh || 2700, // Default consumption
      unit_price_eur_kwh: unit_price_eur_kwh
    };

    // If unit price is missing but we have consumption, calculate it
    if (!unit_price_eur_kwh && annual_kwh) {
      const estimatedFixedCost = (fixed_fee_eur_mo || 8.5) * 12;
      normalizedData.unit_price_eur_kwh = (total_cost_eur - estimatedFixedCost) / annual_kwh;
    }

    // Use OpenAI for advanced normalization if available
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
                content: 'Normalizza e valida i dati energetici per calcoli accurati. Se mancano campi, stimali usando logica energetica. Rispondi SOLO con JSON valido.'
              },
              {
                role: 'user',
                content: `Dati bolletta da normalizzare:
                - Costo totale annuo: €${total_cost_eur}
                - Consumo annuo: ${annual_kwh || 'Non specificato'} kWh
                - Prezzo unitario: €${unit_price_eur_kwh || 'Non specificato'}/kWh
                - Quota fissa mensile: €${fixed_fee_eur_mo || 'Non specificata'}
                
                Calcola i campi mancanti. Se unit_price manca e hai annual_kwh, calcolalo sottraendo quota fissa stimata.
                
                Restituisci JSON:
                {
                  "current_annual_cost_eur": number,
                  "annual_kwh": number,
                  "unit_price_eur_kwh": number,
                  "notes": string
                }`
              }
            ],
            max_tokens: 400,
            temperature: 0.1
          })
        });

        if (response.ok) {
          const aiResult = await response.json();
          const aiContent = aiResult.choices?.[0]?.message?.content?.trim();
          
          if (aiContent) {
            try {
              const aiData = JSON.parse(aiContent);
              normalizedData = {
                current_annual_cost_eur: aiData.current_annual_cost_eur,
                annual_kwh: aiData.annual_kwh,
                unit_price_eur_kwh: aiData.unit_price_eur_kwh
              };
              console.log('AI normalization successful:', normalizedData);
            } catch (parseError) {
              console.error('Failed to parse AI normalization response:', parseError);
            }
          }
        }
      } catch (aiError) {
        console.error('AI normalization failed, using manual calculation:', aiError);
      }
    }

    // Get available offers from database
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .order('unit_price_eur_kwh', { ascending: true });

    if (offersError) {
      console.error('Error fetching offers:', offersError);
    }

    // Calculate best offer
    let bestOfferCost = Infinity;
    let bestOffer = null;

    for (const offer of offers || []) {
      const annualCost = (normalizedData.annual_kwh * offer.unit_price_eur_kwh) + (offer.fixed_fee_eur_mo * 12);
      if (annualCost < bestOfferCost) {
        bestOfferCost = annualCost;
        bestOffer = offer;
      }
    }

    // Fallback if no offers in database
    if (!bestOffer) {
      bestOfferCost = (normalizedData.annual_kwh * 0.22) + (8.5 * 12);
      bestOffer = {
        provider: 'Enel Energia',
        plan_name: 'E-Light Luce',
        unit_price_eur_kwh: 0.22,
        fixed_fee_eur_mo: 8.5
      };
    }

    const annualSaving = Math.max(0, normalizedData.current_annual_cost_eur - bestOfferCost);

    const result = {
      current_annual_cost_eur: normalizedData.current_annual_cost_eur,
      best_offer_annual_cost_eur: bestOfferCost,
      annual_saving_eur: annualSaving,
      best_offer: {
        provider: bestOffer.provider,
        plan: bestOffer.plan_name,
        unit_price_eur_kwh: bestOffer.unit_price_eur_kwh,
        fixed_fee_eur_mo: bestOffer.fixed_fee_eur_mo
      }
    };

    console.log('Normalization and calculation completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-normalize-calculate function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});