import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { uploadId } = await req.json();

    if (!uploadId) {
      throw new Error('uploadId is required');
    }

    // Get OCR results for this upload
    const { data: ocrData, error: ocrError } = await supabase
      .from('ocr_results')
      .select('*')
      .eq('upload_id', uploadId)
      .single();

    if (ocrError || !ocrData) {
      throw new Error('OCR results not found');
    }

    // Get all available offers
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .order('unit_price_eur_kwh', { ascending: true });

    if (offersError || !offers || offers.length === 0) {
      throw new Error('No offers available');
    }

    // Find the best offer (lowest total annual cost)
    let bestOffer = null;
    let lowestCost = Infinity;

    for (const offer of offers) {
      const annualCost = (ocrData.annual_kwh * offer.unit_price_eur_kwh) + (offer.fixed_fee_eur_mo * 12);
      if (annualCost < lowestCost) {
        lowestCost = annualCost;
        bestOffer = { ...offer, annual_cost_offer: annualCost };
      }
    }

    if (!bestOffer) {
      throw new Error('No suitable offer found');
    }

    const annualSaving = ocrData.total_cost_eur - bestOffer.annual_cost_offer;

    // Save quote to database
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        upload_id: uploadId,
        offer_id: bestOffer.id,
        annual_cost_offer: bestOffer.annual_cost_offer,
        annual_saving_eur: annualSaving
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Quote save error:', quoteError);
    }

    // Generate AI-powered copy message
    let copyMessage = `Ti ho trovato un'offerta che ti fa risparmiare €${Math.round(annualSaving)}/anno rispetto alla tua bolletta attuale.`;
    
    if (annualSaving < 50) {
      copyMessage = `La tua offerta è già tra le migliori. Risparmio potenziale minimo (€${Math.round(annualSaving)}/anno).`;
    }

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
                content: 'Genera una sola frase chiara e diretta per comunicare il risparmio energetico. Niente emoji, tono professionale ma amichevole.'
              },
              {
                role: 'user',
                content: annualSaving >= 50 
                  ? `L'utente può risparmiare €${Math.round(annualSaving)} all'anno cambiando da un costo attuale di €${Math.round(ocrData.total_cost_eur)} a un'offerta di €${Math.round(bestOffer.annual_cost_offer)} con ${bestOffer.provider}. Scrivi una frase di presentazione del risparmio.`
                  : `L'utente ha già una buona offerta, può risparmiare solo €${Math.round(annualSaving)} all'anno. Scrivi una frase che lo rassicuri che la sua offerta è già competitiva.`
              }
            ],
            max_tokens: 150,
            temperature: 0.3
          })
        });

        if (response.ok) {
          const aiResult = await response.json();
          const aiMessage = aiResult.choices?.[0]?.message?.content;
          if (aiMessage && aiMessage.trim()) {
            copyMessage = aiMessage.trim();
            console.log('OpenAI copy generation successful');
          }
        }
      } catch (aiError) {
        console.error('AI copy generation failed:', aiError);
      }
    }

    return new Response(JSON.stringify({
      currentCost: ocrData.total_cost_eur,
      bestOffer: {
        provider: bestOffer.provider,
        plan: bestOffer.plan_name,
        annualCost: bestOffer.annual_cost_offer,
        unitPrice: bestOffer.unit_price_eur_kwh
      },
      annualSaving,
      copyMessage,
      quoteId: quote?.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in calculate-savings function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});