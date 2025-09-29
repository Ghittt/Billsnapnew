import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const url = new URL(req.url);
    const annual_kwh = parseFloat(url.searchParams.get('annual_kwh') || '2700');

    // Fetch active offers from database
    const { data: offers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .eq('commodity', 'power')
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!offers || offers.length === 0) {
      return new Response(
        JSON.stringify({ error: 'NO_VERIFIED_OFFERS' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate annual cost for each offer
    const enrichedOffers = offers.map(o => {
      const unit_price = parseFloat(String(o.unit_price_eur_kwh || 0));
      const fixed_fee_monthly = parseFloat(String(o.fixed_fee_eur_mo || 0));
      const fixed_fee_yearly = fixed_fee_monthly * 12;
      const annual_cost = Math.round(annual_kwh * unit_price + fixed_fee_yearly);

      return {
        id: o.id,
        provider: o.provider,
        offer_name: o.plan_name,
        commodity: o.commodity,
        price_kwh: unit_price,
        fixed_fee_month: fixed_fee_monthly,
        fixed_fee_year: fixed_fee_yearly,
        offer_annual_cost_eur: annual_cost,
        source_url: o.redirect_url || o.source || o.terms_url,
        terms_url: o.terms_url,
        last_checked: o.updated_at || o.created_at,
        pricing_type: o.pricing_type,
        area: o.area,
      };
    });

    // Sort by annual cost
    enrichedOffers.sort((a, b) => a.offer_annual_cost_eur - b.offer_annual_cost_eur);

    const response = {
      updated_at: new Date().toISOString(),
      best_offer: enrichedOffers[0],
      offers: enrichedOffers,
      count: enrichedOffers.length,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-verified-offers:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
