import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { profile, offers, userProfile, flags, billType, bestAbsolute, bestPersonalized, personalizationFactors } = await req.json();

    if (!offers || !Array.isArray(offers)) {
      throw new Error('offers array is required');
    }
    
    const isDifferent = bestAbsolute && bestPersonalized && bestAbsolute.offer_id !== bestPersonalized.offer_id;
    const tipo = billType || 'luce';
    const detectedFlags = flags || {};
    const priceMissing = detectedFlags.price_missing || false;
    const tierConsumi = detectedFlags.tier_consumi || 'med';
    const alreadyBest = detectedFlags.already_best || false;

    // Build user context
    let userContext = "";
    if (userProfile) {
      const familyInfo = [];
      if (userProfile.family_size > 1) familyInfo.push(`famiglia di ${userProfile.family_size} persone`);
      if (userProfile.has_children) familyInfo.push(`con figli`);
      if (userProfile.work_from_home) familyInfo.push(`lavoro da casa`);
      if (userProfile.heating_type === 'pompa_calore') familyInfo.push(`pompa di calore`);
      if (familyInfo.length > 0) userContext = `\nPROFILO UTENTE:\n- ${familyInfo.join('\n- ')}`;
    }

    const currentCost = offers[0]?.current_cost_eur || (profile?.total_kwh_year ? profile.total_kwh_year * 0.30 : 810);
    const consumption = tipo === 'gas' ? (profile?.total_smc_year || 1200) : (profile?.total_kwh_year || 2700);
    const unitLabel = tipo === 'gas' ? 'Smc' : 'kWh';

    const systemPrompt = `Sei SnapAI™, consulente energetico di BillSnap. Parla in modo chiaro, onesto e diretto.
TONO: Empatico, realistico, semplice. Mai arrogante.
OBIETTIVO: Spiegare perché un'offerta conviene (o no).

DATI:
- Consumo: ${consumption} ${unitLabel}/anno
- Costo attuale stimato: ${currentCost.toFixed(0)}€/anno
${userContext}

${isDifferent ? `
Devi spiegare DUE offerte:
1. MIGLIORE ASSOLUTA: ${bestAbsolute.provider} (${bestAbsolute.annual_cost_offer}€/anno)
2. MIGLIORE PER TE: ${bestPersonalized.provider} (${bestPersonalized.annual_cost_offer}€/anno)

Rispondi SOLO JSON:
{
  "migliore_assoluta": {
    "offer_id": "${bestAbsolute.offer_id}",
    "categoria": "Migliore in assoluto",
    "emoji": "💰",
    "in_breve": "Sintesi vantaggio prezzo",
    "perche_questa": "Spiegazione prezzo più basso",
    "risparmio_anno": "Cifra in €",
    "nota": "Eventuale compromesso",
    "conclusione": "Stessa energia, meno stress. BillSnap pensa al resto."
  },
  "migliore_personalizzata": {
    "offer_id": "${bestPersonalized.offer_id}",
    "categoria": "Migliore per te",
    "emoji": "💡",
    "in_breve": "Sintesi match profilo",
    "perche_questa": "Spiegazione adattamento abitudini",
    "risparmio_anno": "Cifra in €",
    "nota": "Vantaggio specifico",
    "conclusione": "Stessa energia, meno stress. BillSnap pensa al resto."
  }
}` : `
Spiega l'offerta migliore: ${offers[0].provider} (${offers[0].total_year || 'n/d'}€/anno).

Rispondi SOLO JSON array:
[{
  "offer_id": "${offers[0].offer_id}",
  "headline": "Titolo chiaro",
  "in_breve": "Sintesi vantaggio",
  "perche_per_te": "Adattamento al profilo",
  "cosa_non_fare": "Quale fatica risparmia",
  "numeri_chiari": "Risparmio concreto",
  "prossimo_passo": "Vedi dettagli",
  "conclusione": "Stessa energia, meno stress. BillSnap pensa al resto."
}]
`}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.4
          }
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) throw new Error('Empty AI response');

    let parsed = JSON.parse(content);
    
    // Ensure array format for single offer case
    if (!isDifferent && !Array.isArray(parsed)) {
      parsed = [parsed];
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in explain-choice:', error);
    // Fallback logic could go here, but for now returning error
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
