import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { profile, offers, userProfile, flags } = await req.json();

    // Always-On: anche senza offers possiamo dare spiegazioni
    if (!offers || !Array.isArray(offers)) {
      throw new Error('offers array is required');
    }

    console.log('Generating AI explanations (Always-On mode) for', offers.length, 'offers');

    // Detect flags
    const detectedFlags = flags || {};
    const priceMissing = detectedFlags.price_missing || false;
    const lowConfidence = detectedFlags.low_confidence || false;
    const alreadyBest = detectedFlags.already_best || false;
    const tierConsumi = detectedFlags.tier_consumi || 'med'; // low/med/high

    // Build user context if available
    let userContext = "";
    if (userProfile) {
      const familyInfo = [];
      if (userProfile.family_size > 1) familyInfo.push(`famiglia di ${userProfile.family_size} persone`);
      if (userProfile.has_children) {
        const ages = userProfile.children_ages || [];
        if (ages.length > 0) familyInfo.push(`figli di ${ages.join(', ')} anni`);
      }
      if (userProfile.work_from_home) familyInfo.push(`lavoro da casa`);
      if (userProfile.heating_type === 'pompa_calore') familyInfo.push(`pompa di calore`);
      if (userProfile.main_appliances && userProfile.main_appliances.length > 0) {
        familyInfo.push(`elettrodomestici: ${userProfile.main_appliances.slice(0, 3).join(', ')}`);
      }
      if (familyInfo.length > 0) {
        userContext = `\n\nPROFILO UTENTE:\n- ${familyInfo.join('\n- ')}`;
      }
    }

    const systemPrompt = `Sei l'assistente di BillSnap. Spiega SEMPRE il risultato in 5 blocchi brevi, tono umano e leggero.
Non usare gergo tecnico. Non inventare numeri: se un dato è nullo o poco affidabile, parla in modo qualitativo.
Stile: frasi corte, massimo 3 emoji totali, niente fuffa.

DATI (possono essere null):
- provider_attuale: ${profile?.provider_attuale || 'non disponibile'}
- consumo_annuo_kwh: ${profile?.total_kwh_year || 'non disponibile'}
- prezzo_kwh_attuale: ${profile?.prezzo_kwh_attuale || 'non disponibile'}
- quota_fissa_mese: ${profile?.quota_fissa_mese || 'non disponibile'}
- best_offer: ${offers.length > 0 ? offers[0].provider + ' - ' + offers[0].plan_name : 'nessuna'}
- flags: price_missing=${priceMissing}, low_confidence=${lowConfidence}, already_best=${alreadyBest}, tier_consumi=${tierConsumi}

REGOLE FERREE:
- Se manca il prezzo_kWh o è 0 → NON scrivere cifre precise di risparmio; usa range ('tra X e Y') o 'ti avviso appena c'è un'offerta concreta'.
- Se flags.already_best = true → celebra il fatto che è già una delle migliori, spiega perché e attiva monitoraggio.
- Se consumo_annuo_kwh > 3500 → consiglia offerte senza fasce; se < 2000 → suggerisci piani semplici e quota fissa bassa.
- Mai citare 0.0000 €/kWh. Se vedi 0 o null, ignoralo.
- Chiudi SEMPRE con una CTA umana ('Attiva il monitoraggio intelligente' o 'Vedi i dettagli e attiva in 1 click').
${userContext}

OUTPUT (testo, 5 blocchi con titoletti in grassetto):
1) **In breve:** …
2) **Perché per te:** …
3) **Cosa non devi più fare:** …
4) **Numeri chiari:** …
5) **Prossimo passo:** …

Restituisci un JSON array con un oggetto per ogni offerta. Ogni oggetto deve avere:
{
  "offer_id": "id_offerta",
  "headline": "Titolo emozionale breve",
  "in_breve": "1-2 frasi",
  "perche_per_te": "1-2 frasi personalizzate",
  "cosa_non_fare": "1-2 frasi",
  "numeri_chiari": "1-2 frasi con numeri REALI o senza se mancanti",
  "prossimo_passo": "CTA umana"
}`;

    // Build user content
    const currentCost = offers[0]?.current_cost_eur || (profile?.total_kwh_year ? profile.total_kwh_year * 0.30 : 810);
    const consumption = profile?.total_kwh_year || 2700;

    const userContent = `Profilo consumo dell'utente (possibile null):
- Consumo annuo totale: ${consumption} kWh
- Potenza: ${profile?.potenza_kw || 3} kW
- Costo attuale stimato: ${currentCost.toFixed(0)}€/anno

Offerte da spiegare:
${offers.map((o: any, i: number) => `
${i + 1}. ${o.provider} - ${o.plan_name}
   - ID: ${o.offer_id}
   - Prezzo: ${o.price_kwh || 'n/d'}€/kWh
   - Quota fissa: ${o.fee_month || 'n/d'}€/mese
   - Costo totale annuo: ${o.total_year || 'n/d'}€
   ${i === 0 ? '★ MIGLIORE OFFERTA' : ''}
`).join('\n')}

Flags: ${JSON.stringify(detectedFlags)}

Spiega ogni offerta in modo comprensibile nei 5 blocchi richiesti.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty AI response');
    }

    console.log('AI explanation generated successfully');

    let parsed;
    try {
      parsed = JSON.parse(content);
      
      // Ensure we have an array
      if (!Array.isArray(parsed)) {
        parsed = [parsed];
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Fallback: Always-On explainer
      parsed = offers.map((offer: any, i: number) => ({
        offer_id: offer.offer_id,
        headline: i === 0 ? 'La tua migliore scelta ⚡' : 'Alternativa valida',
        in_breve: i === 0 ? 'Passi a un piano più semplice e conveniente.' : 'Un\'altra opzione da considerare.',
        perche_per_te: `Con ${consumption} kWh/anno, questa offerta è adatta ai tuoi consumi.`,
        cosa_non_fare: 'Niente più confronti infiniti tra offerte: ci penso io.',
        numeri_chiari: priceMissing ? 'Ti avviserò quando avremo dati precisi.' : `Costo annuo circa ${offer.total_year}€.`,
        prossimo_passo: 'Vedi i dettagli e attiva in 1 click ⚡'
      }));
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in explain-choice function:', error);
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
