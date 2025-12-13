import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Calculate realistic total annual cost for an offer
 * Formula: (Energy Component + System/Transport) * 1.10 (VAT)
 */
function calculateTotalCost(
  consumption: number,
  energyPrice: number,
  fixedFeeMonthly: number,
  billType: string
): number {
  // Energy Component
  const energyCost = (consumption * energyPrice) + (fixedFeeMonthly * 12);
  
  // System/Transport/Distribution Charges (regulatory estimates)
  let systemCharges = 0;
  if (billType === 'luce') {
    // Luce: ~0.06€/kWh + 35€ fixed
    systemCharges = (consumption * 0.06) + 35;
  } else if (billType === 'gas') {
    // Gas: ~0.25€/Smc + 70€ fixed
    systemCharges = (consumption * 0.25) + 70;
  }
  
  // VAT 10% on total
  const subtotal = energyCost + systemCharges;
  const total = subtotal * 1.10;
  
  return Math.round(total * 100) / 100;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { uploadId } = await req.json();

    if (!uploadId) {
      throw new Error('uploadId is required');
    }

    console.log('[COMPARE] Starting analysis for upload: ' + uploadId);

    // 1. Fetch Upload & OCR Data
    const { data: uploadData } = await supabase
      .from('uploads')
      .select('tipo_bolletta')
      .eq('id', uploadId)
      .single();

    const billType = uploadData?.tipo_bolletta || 'luce';

    const { data: ocrData } = await supabase
      .from('ocr_results')
      .select('*')
      .eq('upload_id', uploadId)
      .maybeSingle();

    if (!ocrData) {
      console.warn('[COMPARE] No OCR data found, using defaults');
    }

    // 2. SINGLE SOURCE: energy_offers only (consolidated)
    console.log('[COMPARE] Fetching offers from energy_offers (single source)...');
    
    // Note: Not filtering by is_active - fetch all offers and let commodity filter handle it
    const { data: allOffersRaw, error: offersError } = await supabase
      .from('energy_offers')
      .select('*');
    
    // Log column names of first row to debug
    if (allOffersRaw && allOffersRaw.length > 0) {
      console.log('[COMPARE] energy_offers columns:', Object.keys(allOffersRaw[0]));
      console.log('[COMPARE] First offer sample:', JSON.stringify(allOffersRaw[0]).substring(0, 500));
    }

    if (offersError) {
      console.error('[COMPARE] Error fetching energy_offers:', offersError);
      throw new Error('Database error fetching offers.');
    }

    console.log(`[COMPARE] Total offers from energy_offers: ${allOffersRaw?.length || 0}`);

    if (!allOffersRaw || allOffersRaw.length === 0) {
      throw new Error('No active offers in energy_offers table.');
    }

    // Transform to unified format
    const allOffers = allOffersRaw.map(o => ({
      id: o.id,
      provider: o.fornitore || o.provider,
      plan_name: o.nome_offerta || o.offer_name,
      commodity: (o.commodity || o.tipo_fornitura || '').toUpperCase(),
      price_kwh: o.prezzo_energia_euro_kwh,
      unit_price_eur_smc: o.prezzo_energia_euro_smc,
      fixed_fee_eur_mo: o.quota_fissa_mensile_euro || 0,
      pricing_type: o.tipo_prezzo,
      is_green: o.is_green || false,
      redirect_url: o.redirect_url || o.url_offerta,
      promo_active: o.promo_active,
      promo_text: o.promo_text,
      source: 'energy_offers'
    }));

    console.log(`[COMPARE] Transformed offers: ${allOffers.length}`);

    // 3. Determine user consumption
    let annualConsumption = billType === 'gas' ? ocrData?.consumo_annuo_smc : ocrData?.annual_kwh;
    
    if (!annualConsumption || annualConsumption <= 0) {
        console.warn('[COMPARE] Consumption is 0/null. Using defaults/estimates.');
        
        const cost = billType === 'gas' ? ocrData?.costo_annuo_gas : ocrData?.total_cost_eur;
        if (cost && cost > 100) { 
             const avgPrice = billType === 'gas' ? 1.10 : 0.30;
             annualConsumption = Math.round(cost / avgPrice);
             console.log(`[COMPARE] Estimated consumption from cost: ${annualConsumption}`);
        } else {
             annualConsumption = billType === 'gas' ? 1400 : 2700;
             console.log(`[COMPARE] Using default national profile: ${annualConsumption}`);
        }
    }

    const currentAnnualCost = billType === 'gas' ? ocrData?.costo_annuo_gas : ocrData?.total_cost_eur;

    // 4. STRICT commodity filter (GAS ≠ LUCE)
    const commodityFinal = billType === 'gas' ? 'GAS' : 'LUCE';
    console.log('[COMPARE] commodity_final:', commodityFinal);
    console.log('[COMPARE] offers BEFORE commodity filter:', allOffers.length);
    
    const relevantOffers = allOffers.filter(o => 
      o.commodity === commodityFinal || o.commodity === 'DUAL'
    );
    
    console.log('[COMPARE] offers AFTER commodity filter:', relevantOffers.length);
    
    if (relevantOffers.length === 0) {
      throw new Error(`No ${commodityFinal} offers available in energy_offers. Check commodity column.`);
    }

    const calculatedOffers = relevantOffers
      .map(offer => {
        const energyPrice = billType === 'gas' ? offer.unit_price_eur_smc : offer.price_kwh;
        
        if (!energyPrice || energyPrice <= 0) {
          console.warn(`[COMPARE] Skipping offer ${offer.plan_name} - invalid price`);
          return null;
        }

        const simulatedCost = calculateTotalCost(
          annualConsumption,
          energyPrice,
          offer.fixed_fee_eur_mo || 0,
          billType
        );

        const savings = currentAnnualCost ? (currentAnnualCost - simulatedCost) : 0;

        return {
          ...offer,
          simulated_cost: simulatedCost,
          savings: Math.round(savings * 100) / 100,
          reason: `Calculated with realistic formula including system charges and taxes`
        };
      })
      .filter(Boolean) // Remove nulls
      .sort((a, b) => a!.simulated_cost - b!.simulated_cost); // Sort by lowest cost

    if (calculatedOffers.length === 0) {
      throw new Error('No valid offers could be calculated');
    }

    // 5. Select top 3
    const bestOffer = calculatedOffers[0];
    const runnerUp = calculatedOffers[1] || null;
    const thirdOption = calculatedOffers[2] || null;

    const rankedOffers = [bestOffer, runnerUp, thirdOption].filter(Boolean);

    console.log(`[COMPARE] Best offer: ${bestOffer?.plan_name} at ${bestOffer?.simulated_cost}€/year`);

    // 6. Save to comparison_results
    await supabase.from('comparison_results').insert({
      upload_id: uploadId,
      user_id: ocrData?.user_id,
      profile_json: {
        user_consumption: annualConsumption,
        user_current_annual_cost: currentAnnualCost,
        offers_analyzed: calculatedOffers.length,
        calculation_method: 'typescript_direct',
        market_trend: 'Calculated with realistic total cost formula'
      },
      ranked_offers: rankedOffers,
      best_offer_id: bestOffer?.id,
      best_personalized_offer_id: bestOffer?.id,
      personalization_factors: { 
        method: 'typescript_calculation', 
        formula: 'Energy + System/Transport + VAT', 
        source: bestOffer?.source 
      }
    });

    return new Response(JSON.stringify({
      ok: true,
      profile: {
        user_consumption: annualConsumption,
        user_current_annual_cost: currentAnnualCost,
        offers_analyzed: calculatedOffers.length,
        calculation_method: 'typescript_direct'
      },
      ranked: rankedOffers,
      best: bestOffer,
      runnerUp: runnerUp,
      thirdOption: thirdOption
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[COMPARE] Fatal Error:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
