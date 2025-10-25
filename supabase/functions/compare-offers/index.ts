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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { uploadId } = await req.json();

    if (!uploadId) {
      throw new Error('uploadId is required');
    }

    console.log(`Comparing offers for upload: ${uploadId}`);

    // Get OCR results
    const { data: ocrData, error: ocrError } = await supabase
      .from('ocr_results')
      .select('*')
      .eq('upload_id', uploadId)
      .maybeSingle();

    if (ocrError) {
      console.warn('OCR results lookup error, proceeding with defaults');
    }

    // Use defaults if OCR data is missing
    const safeOcr = ocrData ?? {
      annual_kwh: 2700,
      f1_kwh: 945,
      f2_kwh: 945,
      f3_kwh: 810,
      potenza_kw: 3.0,
      tariff_hint: 'trioraria',
      user_id: null,
    };

    // Build consumption profile
    const profile = buildProfile(safeOcr);
    console.log('Consumption profile:', profile);

    // Get active offers
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true);

    if (offersError) {
      throw new Error(`Failed to fetch offers: ${offersError.message}`);
    }

    if (!offers || offers.length === 0) {
      throw new Error('No active offers found');
    }

    // Calculate annual cost for each offer and filter out invalid ones
    const ranked = offers
      .filter(offer => {
        // Safety filters: exclude offers with invalid pricing
        if (offer.tariff_type === 'monoraria' && (!offer.price_kwh || offer.price_kwh <= 0)) {
          return false;
        }
        // Filter out offers with missing critical pricing
        if (!offer.fixed_fee_eur_mo && offer.fixed_fee_eur_mo !== 0) {
          return false;
        }
        // Anti-placeholder: if consumption is high, cost should be realistic
        if (profile.total_kwh_year >= 2000 && offer.price_kwh && offer.price_kwh < 0.05) {
          return false;
        }
        return true;
      })
      .map(offer => {
        const result = simulateAnnualCost(profile, offer);
        return {
          offer_id: offer.id,
          provider: offer.provider,
          plan_name: offer.plan_name,
          tariff_type: offer.tariff_type,
          ...result
        };
      })
      .filter(r => r.total_year > 0) // Exclude zero or negative costs
      .sort((a, b) => a.total_year - b.total_year);

    console.log(`Ranked ${ranked.length} offers, best: ${ranked[0]?.total_year}€/year`);

    // Log calculation to calc_log
    const flags: Record<string, boolean> = {};
    if (!ocrData) flags['used_defaults'] = true;
    if (profile.total_kwh_year < 200 || profile.total_kwh_year > 10000) flags['bad_kwh_range'] = true;
    
    await supabase.from('calc_log').insert({
      upload_id: uploadId,
      tipo: 'luce',
      consumo: profile.total_kwh_year,
      prezzo: null, // Not applicable for comparison
      quota_fissa_mese: null,
      costo_annuo: ranked[0]?.total_year || null,
      flags: flags
    });

    // Store comparison results
    const { error: insertError } = await supabase
      .from('comparison_results')
      .insert({
        upload_id: uploadId,
        user_id: safeOcr.user_id,
        profile_json: profile,
        ranked_offers: ranked,
        best_offer_id: ranked[0]?.offer_id || null
      });

    if (insertError) {
      console.error('Failed to store comparison results:', insertError);
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      profile, 
      ranked,
      best: ranked[0],
      runnerUp: ranked[1] || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in compare-offers function:', error);
    return new Response(
      JSON.stringify({ 
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function num(x: any, d = 0): number {
  const n = Number(x);
  return isFinite(n) ? n : d;
}

function buildProfile(ocr: any) {
  const f1 = num(ocr.f1_kwh, 0);
  const f2 = num(ocr.f2_kwh, 0);
  const f3 = num(ocr.f3_kwh, 0);
  const total = f1 + f2 + f3 || num(ocr.annual_kwh, 2700);
  
  // Normalize to annual if period consumption
  const annual = normalizeToYear(total, ocr.billing_period_start, ocr.billing_period_end);
  
  const shareF1 = total > 0 ? f1 / total : 0.35;
  const shareF2 = total > 0 ? f2 / total : 0.35;
  const shareF3 = total > 0 ? f3 / total : 0.30;
  
  return {
    total_kwh_year: annual,
    f1_share: shareF1,
    f2_share: shareF2,
    f3_share: shareF3,
    potenza_kw: num(ocr.potenza_kw, 3.0),
    tariff_hint: ocr.tariff_hint || 'monoraria'
  };
}

function normalizeToYear(kwh: number, start: string | null, end: string | null): number {
  // If we have period dates, calculate multiplier
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    const days = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0 && days < 365) {
      return Math.round(kwh * (365 / days));
    }
  }
  // Default: assume bimonthly period (2 months)
  return Math.round(kwh * 6);
}

function simulateAnnualCost(profile: any, offer: any) {
  const fixedFee = num(offer.fixed_fee_eur_mo, 7.5) * 12;
  const totalKwh = profile.total_kwh_year || 2700;
  
  let energyCost = 0;
  
  if (offer.tariff_type === 'monoraria') {
    energyCost = totalKwh * num(offer.price_kwh, 0.23);
  } else if (offer.tariff_type === 'bioraria') {
    const priceF1 = num(offer.price_f1, num(offer.price_kwh, 0.25));
    const priceF23 = num(offer.price_f23, num(offer.price_kwh, 0.21));
    energyCost = totalKwh * (profile.f1_share * priceF1 + (1 - profile.f1_share) * priceF23);
  } else if (offer.tariff_type === 'trioraria') {
    const priceF1 = num(offer.price_f1, 0.26);
    const priceF2 = num(offer.price_f2, 0.22);
    const priceF3 = num(offer.price_f3, 0.20);
    energyCost = totalKwh * (
      profile.f1_share * priceF1 + 
      profile.f2_share * priceF2 + 
      profile.f3_share * priceF3
    );
  } else {
    energyCost = totalKwh * num(offer.price_kwh, 0.23);
  }
  
  const powerCost = num(offer.power_fee_year, 0) * num(profile.potenza_kw, 3);
  const total = Number((energyCost + fixedFee + powerCost).toFixed(2));
  
  return {
    energy_year: Number(energyCost.toFixed(2)),
    fee_year: Number(fixedFee.toFixed(2)),
    potenza_year: Number(powerCost.toFixed(2)),
    total_year: total
  };
}
