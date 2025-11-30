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

    // 2. Fetch All Active Offers
    // We fetch from offers_scraped directly to ensure we get the latest data
    const { data: allOffers, error: offersError } = await supabase
      .from('offers_scraped')
      .select('*');
      // .eq('is_active', true); // Assuming all scraped offers are candidates

    if (offersError || !allOffers || allOffers.length === 0) {
      throw new Error('No offers available in database');
    }

    console.log(`[COMPARE] Found ${allOffers.length} candidate offers`);

    // 3. Prepare Data for OpenAI
    const billContext = {
      type: billType,
      annual_consumption: billType === 'gas' ? ocrData?.consumo_annuo_smc : ocrData?.annual_kwh,
      current_provider: ocrData?.provider || 'Sconosciuto',
      current_annual_cost: billType === 'gas' ? ocrData?.costo_annuo_gas : ocrData?.total_cost_eur, // Note: total_cost_eur might be bill total, not annual. AI will handle logic.
      raw_ocr: ocrData
    };

    // Simplify offers for prompt to save tokens
    const offersContext = allOffers
      .filter(o => o.commodity === billType || o.commodity === 'dual')
      .map(o => ({
        id: o.id,
        provider: o.provider,
        name: o.plan_name,
        price_energy: billType === 'gas' ? o.unit_price_eur_smc : o.price_kwh,
        fixed_fee: o.fixed_fee_eur_mo,
        type: o.pricing_type,
        is_green: o.is_green
      }));

    console.log(`[COMPARE] Sending ${offersContext.length} relevant offers to OpenAI`);

    // 4. Call OpenAI
    const systemPrompt = `You are an expert energy analyst for the Italian market.
Your goal is to compare a user's energy bill (OCR data) against a list of available offers and recommend the TOP 3 best offers.

RULES:
1. **Fuzzy Matching**: Match the user's current provider (e.g., "A2A Energia") with the offers list intelligently.
2. **Savings Calculation**: Calculate annual savings based on the user's annual consumption.
   - Annual Cost = (Consumption * Energy Price) + (Fixed Fee * 12).
   - If user's annual consumption is missing, assume: Luce=2700 kWh, Gas=1400 Smc.
   - If user's current cost is missing/unreliable, estimate it based on standard market rates (Luce=0.25€/kWh, Gas=1.0€/Smc).
3. **Selection**: Select the 3 best offers based on lowest annual cost.
4. **Output**: Return strictly valid JSON.

JSON FORMAT:
{
  "success": true,
  "bestOffer": { "id": "uuid", "simulated_cost": 123.45, "savings": 50.00, "reason": "..." },
  "runnerUp": { "id": "uuid", "simulated_cost": 130.00, "savings": 45.00, "reason": "..." },
  "thirdOption": { "id": "uuid", "simulated_cost": 135.00, "savings": 40.00, "reason": "..." },
  "analysis": {
    "user_consumption": 2700,
    "user_current_annual_cost_estimated": 900,
    "market_trend": "Prices are falling..."
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
    // We need to merge the AI result with full offer details
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
      best_personalized_offer_id: bestOffer?.id, // Assuming best is also personalized for now
      personalization_factors: { method: 'ai_gpt4o', analysis: result.analysis }
    });

    // Save to billsnap_offers (for frontend display compatibility)
    for (const offer of rankedOffers) {
      await supabase.from('billsnap_offers').insert({
        raw_data: {
          upload_id: uploadId,
          offer_id: offer.id,
          provider: offer.provider,
          plan_name: offer.plan_name,
          commodity: offer.commodity,
          simulated_cost: offer.simulated_cost,
          savings: offer.savings,
          reason: offer.reason,
          is_best: offer.id === bestOffer?.id
        },
        source: 'compare-offers-ai'
      });
    }

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
