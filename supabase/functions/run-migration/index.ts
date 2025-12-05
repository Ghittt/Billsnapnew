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

    // Fetch all offers
    const { data: offers, error: fetchError } = await supabaseClient
      .from('offers_scraped')
      .select('id, provider, plan_name');

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    const getProviderUrl = (provider: string, planName: string) => {
      const p = (provider || '').toLowerCase();
      if (p.includes('pulsee')) return 'https://www.pulsee.it/offerte-luce-gas';
      if (p.includes('enel')) return 'https://www.enel.it/it/luce-e-gas';
      if (p.includes('eni') || p.includes('plenitude')) return 'https://eniplenitude.com/offerte';
      if (p.includes('a2a')) return 'https://www.a2a.it/offerte-luce-gas';
      if (p.includes('edison')) return 'https://www.edison.it/offerte-luce-gas';
      if (p.includes('sorgenia')) return 'https://www.sorgenia.it/offerte-luce-gas';
      if (p.includes('illumia')) return 'https://www.illumia.it/offerte';
      if (p.includes('wekiwi')) return 'https://www.wekiwi.it/offerte';
      if (p.includes('iren')) return 'https://www.irenlucegas.it/offerte';
      if (p.includes('hera')) return 'https://www.heracomm.it/offerte';
      return `https://www.google.com/search?q=${encodeURIComponent(provider + ' ' + planName + ' offerta')}`;
    };

    let updated = 0;
    for (const offer of (offers || [])) {
      const url = getProviderUrl(offer.provider, offer.plan_name);
      const { error: updateError } = await supabaseClient
        .from('offers_scraped')
        .update({ redirect_url: url })
        .eq('id', offer.id);
      
      if (!updateError) updated++;
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: `Updated ${updated} offers with redirect URLs`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
