import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { uploadId } = await req.json();

    if (!uploadId) {
      throw new Error('uploadId is required');
    }

    console.log(`[COMPARE] Starting analysis for upload: ${uploadId}`);

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

    // 2. Fetch offers from MULTIPLE SOURCES
    let allOffers: any[] = [];

    // 2a. Try offers_live (Firecrawl scraped offers - PRIORITY)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { data: liveOffers, error: liveError } = await supabase
      .from('offers_live')
      .select('*')
      .gt('scraped_at', oneDayAgo.toISOString());

    if (!liveError && liveOffers && liveOffers.length > 0) {
      console.log(`[COMPARE] Found ${liveOffers.length} live offers from Firecrawl`);
      // Transform to unified format
      allOffers = liveOffers.map(o => ({
        id: o.id,
        provider: o.fornitore,
        plan_name: o.nome_offerta,
        commodity: o.tipo,
        price_kwh: o.prezzo_energia_euro_kwh,
        unit_price_eur_smc: o.prezzo_energia_euro_smc,
        fixed_fee_eur_mo: o.quota_fissa_mensile_euro || 0,
        pricing_type: o.tipo_prezzo,
        is_green: false,
        redirect_url: o.url_offerta,
        promo_active: o.promozione_attiva,
        promo_text: o.sconto_promozione,
        source: 'firecrawl'
      }));
    }

    // 2b. Fallback to offers_scraped if no live offers
    if (allOffers.length === 0) {
      console.log('[COMPARE] No live offers, checking offers_scraped...');
      const fortyFiveDaysAgo = new Date();
      fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);

      let { data: scrapedOffers } = await supabase
        .from('offers_scraped')
        .select('*')
        .gt('updated_at', fortyFiveDaysAgo.toISOString());

      if (!scrapedOffers || scrapedOffers.length === 0) {
        const { data: fallbackOffers } = await supabase
          .from('offers_scraped')
          .select('*')
          .limit(20)
          .order('updated_at', { ascending: false });
        scrapedOffers = fallbackOffers;
      }

      if (scrapedOffers && scrapedOffers.length > 0) {
        console.log(`[COMPARE] Found ${scrapedOffers.length} scraped offers`);
        allOffers = scrapedOffers.map(o => ({ ...o, source: 'offers_scraped' }));
      }
    }

    if (allOffers.length === 0) {
      throw new Error('No offers available in database. Run sync-offers first.');
    }

    console.log(`[COMPARE] Total offers for analysis: ${allOffers.length}`);

    // 3. Prepare Data for OpenAI
    // ROBUST FALLBACK LOGIC: If OCR returns 0 or null, use national averages.
    // This prevents the "You consume 0 kWh" error.
    let annualConsumption = billType === 'gas' ? ocrData?.consumo_annuo_smc : ocrData?.annual_kwh;
    
    // If invalid (null, undefined, 0), try to estimate from cost or use standard profile
    if (!annualConsumption || annualConsumption <= 0) {
        console.warn('[COMPARE] Consumption is 0/null. Using defaults/estimates.');
        
        // Try estimation from cost
        const cost = billType === 'gas' ? ocrData?.costo_annuo_gas : ocrData?.total_cost_eur;
        if (cost && cost > 100) { // arbitrary threshold to ensure it's a real annual cost
             // Rough estimate: Cost / AvgPrice (approx 0.30/kWh or 1.10/Smc)
             const avgPrice = billType === 'gas' ? 1.10 : 0.30;
             annualConsumption = Math.round(cost / avgPrice);
             console.log(`[COMPARE] Estimated consumption from cost: ${annualConsumption}`);
        } else {
             // Use Default National Profile
             annualConsumption = billType === 'gas' ? 1400 : 2700;
             console.log(`[COMPARE] Using default national profile: ${annualConsumption}`);
        }
    }

    const billContext = {
      type: billType,
      annual_consumption: annualConsumption,
      current_provider: ocrData?.provider || 'Sconosciuto',
      current_annual_cost: billType === 'gas' ? ocrData?.costo_annuo_gas : ocrData?.total_cost_eur,
      raw_ocr: ocrData
    };

    const offersContext = allOffers
      .filter(o => o.commodity === billType || o.commodity === 'dual' || o.commodity === 'luce')
      .map(o => ({
        id: o.id,
        provider: o.provider,
        name: o.plan_name,
        price_energy: billType === 'gas' ? o.unit_price_eur_smc : o.price_kwh,
        fixed_fee: o.fixed_fee_eur_mo,
        type: o.pricing_type,
        is_green: o.is_green,
        promo: o.promo_active ? o.promo_text : null,
        url: o.redirect_url
      }));

    console.log(`[COMPARE] Sending ${offersContext.length} relevant offers to OpenAI`);

    // 4. Call OpenAI
    const systemPrompt = `You are an expert energy analyst for the Italian market.
Compare a user's energy bill against available offers and recommend the TOP 3 best offers.

RULES:
1. Calculate annual savings based on user's annual consumption.
   - Annual Cost = (Consumption * Energy Price) + (Fixed Fee * 12).
   - The user's consumption is provided in 'annual_consumption'. Use this value.
   - If current cost is missing, estimate from standard rates (Luce=0.25€/kWh, Gas=1.0€/Smc).
2. Select the 3 best offers based on LOWEST annual cost.
3. Include any active promotions in the savings calculation.
4. Return strictly valid JSON.

JSON FORMAT:
{
  "success": true,
  "bestOffer": { "id": "uuid", "simulated_cost": 123.45, "savings": 50.00, "reason": "..." },
  "runnerUp": { "id": "uuid", "simulated_cost": 130.00, "savings": 45.00, "reason": "..." },
  "thirdOption": { "id": "uuid", "simulated_cost": 135.00, "savings": 40.00, "reason": "..." },
  "analysis": {
    "user_consumption": 2700,
    "user_current_annual_cost_estimated": 900,
    "offers_analyzed": 10,
    "market_trend": "..."
  }
}`;

    const userPrompt = JSON.stringify({
      bill: billContext,
      available_offers: offersContext
    });

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!openAiResponse.ok) {
      const err = await openAiResponse.text();
      console.error('[COMPARE] OpenAI Error:', err);
      throw new Error(`OpenAI API error: ${err}`);
    }

    const aiData = await openAiResponse.json();
    const result = JSON.parse(aiData.choices[0].message.content);

    console.log('[COMPARE] AI Analysis complete:', result.success);

    // 5. Hydrate Results & Save
    const getFullOffer = (shortOffer: any) => {
      if (!shortOffer) return null;
      const full = allOffers.find(o => o.id === shortOffer.id);
      return full ? { ...full, ...shortOffer } : null;
    };

    const bestOffer = getFullOffer(result.bestOffer);
    const runnerUp = getFullOffer(result.runnerUp);
    const thirdOption = getFullOffer(result.thirdOption);

    const rankedOffers = [bestOffer, runnerUp, thirdOption].filter(Boolean);

    // Save to comparison_results
    await supabase.from('comparison_results').insert({
      upload_id: uploadId,
      user_id: ocrData?.user_id,
      profile_json: result.analysis,
      ranked_offers: rankedOffers,
      best_offer_id: bestOffer?.id,
      best_personalized_offer_id: bestOffer?.id,
      personalization_factors: { method: 'ai_gpt4o', analysis: result.analysis, source: bestOffer?.source }
    });

    return new Response(JSON.stringify({
      ok: true,
      profile: result.analysis,
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
