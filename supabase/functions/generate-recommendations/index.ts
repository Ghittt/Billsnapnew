import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { upload_id, user_id } = await req.json();

    if (!upload_id || !user_id) {
      throw new Error('Missing upload_id or user_id');
    }

    console.log('Generating recommendations for upload:', upload_id);

    // Fetch OCR results
    const { data: ocrData, error: ocrError } = await supabaseClient
      .from('ocr_results')
      .select('*')
      .eq('upload_id', upload_id)
      .single();

    if (ocrError || !ocrData) {
      throw new Error('No OCR data found');
    }

    // Fetch comparison results to see alternative offers
    const { data: comparisonData } = await supabaseClient
      .from('comparison_results')
      .select('*')
      .eq('upload_id', upload_id)
      .maybeSingle();

    const recommendations: any[] = [];

    // Recommendation 1: Check if current consumption is high
    const annualKwh = ocrData.annual_kwh || 0;
    if (annualKwh > 3500) {
      recommendations.push({
        user_id,
        upload_id,
        title: 'Consumo Elevato Rilevato',
        description: `Il tuo consumo annuale di ${annualKwh.toFixed(0)} kWh è superiore alla media. Considera di verificare eventuali sprechi energetici o elettrodomestici inefficienti.`,
        recommendation_type: 'energy_efficiency',
        priority: 7,
        estimated_saving_eur: annualKwh * 0.05, // Stima risparmio 5%
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 giorni
      });
    }

    // Recommendation 2: Suggest contract review if tariff seems suboptimal
    if (comparisonData && comparisonData.ranked_offers) {
      const rankedOffers = comparisonData.ranked_offers;
      if (Array.isArray(rankedOffers) && rankedOffers.length > 1) {
        const bestOffer = rankedOffers[0];
        const currentCost = ocrData.costo_annuo_totale || 0;
        const bestOfferCost = bestOffer.annual_cost || currentCost;
        const potentialSaving = currentCost - bestOfferCost;

        if (potentialSaving > 50) {
          recommendations.push({
            user_id,
            upload_id,
            title: 'Risparmio Potenziale Significativo',
            description: `Abbiamo trovato offerte che potrebbero farti risparmiare fino a €${potentialSaving.toFixed(0)} all'anno. Valuta di cambiare fornitore.`,
            recommendation_type: 'switch_provider',
            priority: 9,
            estimated_saving_eur: potentialSaving,
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 giorni
          });
        }
      }
    }

    // Recommendation 3: Green energy suggestion
    const isGreen = ocrData.provider?.toLowerCase().includes('green') || false;
    if (!isGreen && annualKwh > 2000) {
      recommendations.push({
        user_id,
        upload_id,
        title: 'Passa all\'Energia Verde',
        description: 'Con il tuo livello di consumo, passare a energia 100% rinnovabile potrebbe fare una grande differenza per l\'ambiente senza costi aggiuntivi significativi.',
        recommendation_type: 'green_energy',
        priority: 5,
        estimated_saving_eur: null,
        expires_at: null, // No expiration
      });
    }

    // Recommendation 4: Seasonal optimization
    const now = new Date();
    const month = now.getMonth();
    if (month >= 9 || month <= 2) { // Oct-Feb (winter)
      recommendations.push({
        user_id,
        upload_id,
        title: 'Ottimizzazione Riscaldamento Invernale',
        description: 'Siamo in inverno. Abbassa il termostato di 1°C per risparmiare circa il 6% sui costi di riscaldamento. Considera di installare un termostato smart.',
        recommendation_type: 'seasonal_tip',
        priority: 6,
        estimated_saving_eur: (ocrData.costo_annuo_totale || 0) * 0.06,
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 giorni
      });
    }

    // Insert all recommendations
    if (recommendations.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('ai_recommendations')
        .insert(recommendations);

      if (insertError) {
        console.error('Error inserting recommendations:', insertError);
        throw insertError;
      }

      console.log(`Successfully created ${recommendations.length} recommendations`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recommendations_count: recommendations.length,
        recommendations 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
