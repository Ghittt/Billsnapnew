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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse query parameters
    const url = new URL(req.url);
    const commodity = url.searchParams.get('commodity') || 'power';
    const annualKwh = parseFloat(url.searchParams.get('annual_kwh') || '2700');
    const annualSmc = parseFloat(url.searchParams.get('annual_smc') || '0');

    console.log(`Finding best offer for ${commodity}: ${annualKwh} kWh/year, ${annualSmc} Smc/year`);

    // Validate input parameters
    if (commodity === 'power' && (annualKwh < 100 || annualKwh > 10000)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid annual_kwh. Must be between 100 and 10000' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (commodity === 'gas' && (annualSmc < 10 || annualSmc > 5000)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid annual_smc. Must be between 10 and 5000' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all active offers for the requested commodity
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .eq('commodity', commodity)
      .eq('is_active', true)
      .order('unit_price_eur_kwh', { ascending: true });

    if (offersError) {
      console.error('Error fetching offers:', offersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch offers' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!offers || offers.length === 0) {
      return new Response(JSON.stringify({ error: 'No active offers found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${offers.length} active offers for ${commodity}`);

    // Calculate annual cost for each offer and find the best one
    let bestOffer = null;
    let lowestCost = Infinity;

    for (const offer of offers) {
      let annualCost = 0;

      if (commodity === 'power') {
        // Calculate electricity cost: (kWh * price_per_kWh) + (fixed_fee * 12)
        annualCost = (annualKwh * offer.unit_price_eur_kwh) + (offer.fixed_fee_eur_mo * 12);
      } else if (commodity === 'gas') {
        // Calculate gas cost: (Smc * price_per_Smc) + (fixed_fee * 12)
        annualCost = (annualSmc * offer.unit_price_eur_smc) + (offer.fixed_fee_eur_mo * 12);
      }

      console.log(`${offer.provider} ${offer.plan_name}: €${annualCost.toFixed(2)}/year`);

      if (annualCost < lowestCost) {
        lowestCost = annualCost;
        bestOffer = { ...offer, offer_annual_cost_eur: annualCost };
      }
    }

    if (!bestOffer) {
      return new Response(JSON.stringify({ error: 'No suitable offer found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare response with best offer details
    const response = {
      provider: bestOffer.provider,
      plan_name: bestOffer.plan_name,
      commodity: bestOffer.commodity,
      unit_price_eur_kwh: bestOffer.unit_price_eur_kwh,
      unit_price_eur_smc: bestOffer.unit_price_eur_smc,
      fixed_fee_eur_mo: bestOffer.fixed_fee_eur_mo,
      offer_annual_cost_eur: bestOffer.offer_annual_cost_eur,
      pricing_type: bestOffer.pricing_type,
      terms_url: bestOffer.terms_url,
      redirect_url: bestOffer.redirect_url,
      notes: bestOffer.notes || 'Stima basata su consumo fornito',
      offer_id: bestOffer.id,
      calculation: {
        annual_consumption: commodity === 'power' ? annualKwh : annualSmc,
        unit: commodity === 'power' ? 'kWh' : 'Smc',
        unit_cost: commodity === 'power' ? bestOffer.unit_price_eur_kwh : bestOffer.unit_price_eur_smc,
        variable_cost: commodity === 'power' 
          ? (annualKwh * bestOffer.unit_price_eur_kwh)
          : (annualSmc * bestOffer.unit_price_eur_smc),
        fixed_cost_annual: bestOffer.fixed_fee_eur_mo * 12,
        total_annual_cost: bestOffer.offer_annual_cost_eur
      }
    };

    console.log('Best offer found:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-best-offer function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});