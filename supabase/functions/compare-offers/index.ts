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

    // Get upload info to determine bill type
    const { data: uploadData } = await supabase
      .from('uploads')
      .select('tipo_bolletta')
      .eq('id', uploadId)
      .maybeSingle();

    const billType = uploadData?.tipo_bolletta || 'luce';
    console.log(`Bill type: ${billType}`);

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
      consumo_annuo_smc: 1200,
      prezzo_gas_eur_smc: null,
    };

    // Build consumption profile based on bill type
    const profile = billType === 'gas' ? buildGasProfile(safeOcr) : buildProfile(safeOcr);
    console.log('Consumption profile:', profile);

    // Get active offers filtered by commodity type
    const commodityFilter = billType === 'combo' ? undefined : billType;
    let offersQuery = supabase
      .from('offers')
      .select('*')
      .eq('is_active', true);
    
    if (commodityFilter) {
      offersQuery = offersQuery.eq('commodity', commodityFilter);
    }

    const { data: offers, error: offersError } = await offersQuery;

    if (offersError) {
      throw new Error(`Failed to fetch offers: ${offersError.message}`);
    }

    if (!offers || offers.length === 0) {
      throw new Error('No active offers found');
    }

    // Calculate annual cost for each offer and filter out invalid ones
    const ranked = offers
      .filter(offer => {
        // Filter based on commodity type
        if (billType === 'gas' && offer.commodity !== 'gas') return false;
        if (billType === 'luce' && offer.commodity !== 'luce') return false;
        
        // Safety filters for luce offers
        if (offer.commodity === 'luce') {
          if (offer.tariff_type === 'monoraria' && (!offer.price_kwh || offer.price_kwh <= 0)) {
            return false;
          }
          const totalKwh = (profile as any).total_kwh_year || 0;
          if (totalKwh >= 2000 && offer.price_kwh && offer.price_kwh < 0.05) {
            console.warn(`Rejecting unrealistic offer ${offer.id}: very low price`);
            return false;
          }
        }
        
        // Safety filters for gas offers
        if (offer.commodity === 'gas') {
          if (!offer.unit_price_eur_smc || offer.unit_price_eur_smc <= 0) {
            return false;
          }
        }
        
        return true;
      })
      .map(offer => {
        const simResult = offer.commodity === 'gas' 
          ? simulateGasAnnualCost(profile, offer)
          : simulateAnnualCost(profile, offer);
        return {
          ...offer,
          simulated_cost: simResult.total,
          breakdown: simResult
        };
      })
      .sort((a, b) => a.simulated_cost - b.simulated_cost)
      .slice(0, 5);

    console.log(`Ranked ${ranked.length} offers, best: ${ranked[0]?.simulated_cost}€/year`);

    // Log calculation to calc_log
    const flags: Record<string, boolean> = {};
    if (!ocrData) flags['used_defaults'] = true;
    
    const totalKwh = (profile as any).total_kwh_year;
    const totalSmc = (profile as any).total_smc_year;
    
    if (billType === 'luce' && totalKwh && (totalKwh < 200 || totalKwh > 10000)) {
      flags['bad_kwh_range'] = true;
    }
    if (billType === 'gas' && totalSmc && (totalSmc < 50 || totalSmc > 2000)) {
      flags['bad_smc_range'] = true;
    }
    
    await supabase.from('calc_log').insert({
      upload_id: uploadId,
      tipo: billType,
      consumo: billType === 'gas' ? totalSmc : totalKwh,
      prezzo: null,
      quota_fissa_mese: null,
      costo_annuo: ranked[0]?.simulated_cost || null,
      flags: flags
    });

    // Store comparison results
    const { error: insertError } = await supabase
      .from('comparison_results')
      .insert({
        upload_id: uploadId,
        user_id: safeOcr.user_id,
        profile_json: { ...profile, bill_type: billType },
        ranked_offers: ranked,
        best_offer_id: ranked[0]?.id || null
      });

    if (insertError) {
      console.error('Failed to store comparison results:', insertError);
    }

    return new Response(JSON.stringify({ 
      ok: true, 
      profile: { ...profile, bill_type: billType }, 
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
  const totalAnnual = num(ocr.annual_kwh, 2700);
  const f1 = num(ocr.f1_kwh);
  const f2 = num(ocr.f2_kwh);
  const f3 = num(ocr.f3_kwh);

  // Derive shares
  let shareF1 = 0.35, shareF2 = 0.35, shareF3 = 0.30;
  if (f1 + f2 + f3 > 100) {
    const sumF = f1 + f2 + f3;
    shareF1 = f1 / sumF;
    shareF2 = f2 / sumF;
    shareF3 = f3 / sumF;
  }

  // Detect tariff type
  let tariffHint = 'monoraria';
  if (ocr.tariff_hint) {
    tariffHint = ocr.tariff_hint;
  } else if (f1 > 0 || f2 > 0 || f3 > 0) {
    tariffHint = 'trioraria';
  }

  return {
    total_kwh_year: totalAnnual,
    share_f1: shareF1,
    share_f2: shareF2,
    share_f3: shareF3,
    power_kw: num(ocr.potenza_kw, 3.0),
    tariff_hint: tariffHint,
    provider_attuale: ocr.provider || 'Fornitore Corrente',
    prezzo_kwh_attuale: num(ocr.unit_price_eur_kwh),
    quota_fissa_mese: num(ocr.total_cost_eur) ? num(ocr.total_cost_eur) / 12 : null
  };
}

function buildGasProfile(ocr: any) {
  const totalAnnualSmc = num(ocr.consumo_annuo_smc, 1200);
  
  return {
    total_smc_year: totalAnnualSmc,
    provider_attuale: ocr.provider || 'Fornitore Corrente',
    prezzo_gas_attuale: num(ocr.prezzo_gas_eur_smc),
    quota_fissa_mese: num(ocr.costo_annuo_gas) ? num(ocr.costo_annuo_gas) / 12 : null
  };
}

function normalizeToYear(kwh: number, start: string | null, end: string | null): number {
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    const days = (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24);
    if (days > 0 && days < 365) {
      return Math.round(kwh * (365 / days));
    }
  }
  return Math.round(kwh * 6);
}

function simulateAnnualCost(profile: any, offer: any) {
  const totalKwh = profile.total_kwh_year || 2700;
  const fixedAnnual = (offer.fixed_fee_eur_mo || 0) * 12;
  const powerAnnual = (offer.power_fee_year || 0) * (profile.power_kw || 3);

  let energyCost = 0;

  if (offer.tariff_type === 'monoraria') {
    energyCost = totalKwh * (offer.price_kwh || 0);
  } else if (offer.tariff_type === 'bioraria') {
    const f1Kwh = totalKwh * profile.share_f1;
    const f23Kwh = totalKwh * (profile.share_f2 + profile.share_f3);
    energyCost = 
      f1Kwh * (offer.price_f1 || offer.price_kwh || 0) +
      f23Kwh * (offer.price_f23 || offer.price_kwh || 0);
  } else if (offer.tariff_type === 'trioraria') {
    energyCost = 
      totalKwh * profile.share_f1 * (offer.price_f1 || offer.price_kwh || 0) +
      totalKwh * profile.share_f2 * (offer.price_f2 || offer.price_kwh || 0) +
      totalKwh * profile.share_f3 * (offer.price_f3 || offer.price_kwh || 0);
  }

  return {
    total: fixedAnnual + powerAnnual + energyCost,
    fixed: fixedAnnual,
    power: powerAnnual,
    energy: energyCost
  };
}

function simulateGasAnnualCost(profile: any, offer: any) {
  const totalSmc = profile.total_smc_year || 1200;
  const fixedAnnual = (offer.fixed_fee_eur_mo || 0) * 12;
  
  const gasCost = totalSmc * (offer.unit_price_eur_smc || 0);

  return {
    total: fixedAnnual + gasCost,
    fixed: fixedAnnual,
    power: 0,
    energy: gasCost
  };
}
