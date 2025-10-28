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

    const { profile, offers, userProfile, flags, billType } = await req.json();

    // Always-On: anche senza offers possiamo dare spiegazioni
    if (!offers || !Array.isArray(offers)) {
      throw new Error('offers array is required');
    }

    const tipo = billType || 'luce'; // luce | gas | combo
    console.log(`Generating AI explanations (Always-On mode) for ${offers.length} offers, bill type: ${tipo}`);

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

    // Calculate costs and consumption before building prompts
    const currentCost = offers[0]?.current_cost_eur || (profile?.total_kwh_year ? profile.total_kwh_year * 0.30 : 810);
    const consumption = tipo === 'gas' 
      ? (profile?.total_smc_year || 1200)
      : (profile?.total_kwh_year || 2700);

    // Adapt messaging based on bill type
    const commodityLabel = tipo === 'gas' ? 'gas' : 'energia elettrica';
    const unitLabel = tipo === 'gas' ? 'Smc' : 'kWh';
    const priceLabel = tipo === 'gas' ? 'prezzo_gas_attuale' : 'prezzo_kwh_attuale';
    
    const typeSpecificGuidance = tipo === 'gas' 
      ? '- Per GAS: parla di stagionalità e prevedibilità consumi; usa unità Smc.'
      : '- Per LUCE: parla di fasce orarie/semplicità; evita jargon tecnico.';

    const systemPrompt = `Sei l'assistente AI di BillSnap.
Scrivi SEMPRE una spiegazione chiara, onesta e professionale del risultato, anche se i dati sono parziali.
Non inventare numeri o frasi sensazionalistiche. Parla come un consulente esperto che spiega i dati in modo semplice.

TIPOLOGIA BOLLETTA: ${tipo.toUpperCase()} (${commodityLabel})

DATI (possono essere null):
- provider_attuale: ${profile?.provider_attuale || 'non disponibile'}
- consumo_annuo_${unitLabel.toLowerCase()}: ${consumption || 'non disponibile'}
- ${priceLabel}: ${profile?.[priceLabel] || 'non disponibile'}
- quota_fissa_mese: ${profile?.quota_fissa_mese || 'non disponibile'}
- best_offer: ${offers.length > 0 ? offers[0].provider + ' - ' + offers[0].plan_name : 'nessuna'}
- costo_attuale_annuo: ${currentCost.toFixed(0)}€
- flags: price_missing=${priceMissing}, low_confidence=${lowConfidence}, already_best=${alreadyBest}, tier_consumi=${tierConsumi}

USA SEMPRE questa struttura obbligatoria:
1️⃣ **In breve:** riassumi in 1 riga l'esito (es. "Stai già pagando una delle migliori tariffe del mercato" oppure "Puoi risparmiare circa 5–10% con una nuova offerta stabile")
2️⃣ **Perché per te:** spiega in 1–2 frasi come questa offerta si adatta al profilo dell'utente (consumi, fascia, semplicità, sicurezza)
3️⃣ **Cosa non devi più fare:** spiega quale fatica o incertezza risparmia (es. niente più confronti mensili, niente cambi di fascia)
4️⃣ **Numeri chiari:**
  - Se il risparmio è noto e realistico, scrivi "Risparmi circa {{delta_euro}} €/anno, pari a ~{{percentuale}}% della spesa attuale".
  - Se il dato è incerto, scrivi "Differenza stimata di poche decine di euro/anno. Ti avviserò appena trovo un valore preciso".

REGOLE FERREE:
- Non usare metafore tipo "mesi gratis", "bollette zero", "festa del risparmio".
- Usa toni calmi, credibili, come se parlassi a un cliente reale.
- Niente emoji tranne ⚡ o 🔔 se davvero servono.
- Se il risparmio è inferiore a 50 €/anno, sottolinea la stabilità più che il guadagno.
- Se la tariffa attuale è già tra le migliori, celebra la serenità ("non serve cambiare ora, ma ti tengo aggiornato").
- Mai citare prezzi 0.0000. Se vedi 0 o null, ignoralo.
- Se consumo > 3500 → consiglia offerte semplici; se < 2000 → suggerisci piani base.
${typeSpecificGuidance}
${userContext}

Restituisci un JSON array con un oggetto per ogni offerta. Ogni oggetto deve avere:
{
  "offer_id": "id_offerta",
  "headline": "Titolo chiaro e professionale",
  "in_breve": "1 riga riassuntiva dell'esito",
  "perche_per_te": "1-2 frasi su come si adatta al profilo utente",
  "cosa_non_fare": "1-2 frasi su quale fatica risparmia",
  "numeri_chiari": "Risparmio preciso se noto, altrimenti range qualitativo",
  "prossimo_passo": "CTA chiara e umana (es. 'Vedi dettagli e attiva' o 'Attiva monitoraggio')"
}`;

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
        temperature: 0.4,
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

      // Anti-fuffa filter: check for banned marketing words
      const bannedWords = ['gratis', 'regalo', 'festa', '🎉', 'zero', 'incredibile', 'straordinario'];
      const needsRegeneration = parsed.some((item: any) => {
        const fullText = JSON.stringify(item).toLowerCase();
        return bannedWords.some(word => fullText.includes(word));
      });

      if (needsRegeneration) {
        console.warn('AI output contained banned marketing words, using fallback');
        throw new Error('Marketing tone detected');
      }
    } catch (e) {
      console.error('Failed to parse AI response or marketing tone detected:', content);
      // Fallback: Professional explainer
      const savings = offers[0]?.total_year ? Math.max(0, currentCost - offers[0].total_year) : 0;
      const savingsPercent = currentCost > 0 ? ((savings / currentCost) * 100).toFixed(0) : 0;

      parsed = offers.map((offer: any, i: number) => ({
        offer_id: offer.offer_id,
        headline: i === 0 ? (alreadyBest ? 'Sei già su una delle migliori tariffe' : 'Piano semplice e trasparente') : 'Alternativa valida',
        in_breve: i === 0 ? 
          (alreadyBest ? 'Stai già pagando una delle migliori tariffe del mercato.' : 
          savings >= 50 ? `Puoi risparmiare circa ${savingsPercent}% con questa offerta stabile.` :
          'Puoi ridurre leggermente la spesa, restando su un piano semplice.') : 
          'Un\'altra opzione da considerare per i tuoi consumi.',
        perche_per_te: `Con ${consumption} kWh/anno, questa offerta a prezzo ${offer.price_kwh ? 'fisso' : 'variabile'} garantisce ${tierConsumi === 'high' ? 'stabilità anche con consumi elevati' : 'semplicità e trasparenza'}.`,
        cosa_non_fare: 'Niente più confronti mensili o cambi di fascia: stabilità garantita.',
        numeri_chiari: priceMissing || !offer.total_year ? 
          'Differenza stimata di poche decine di euro/anno. Ti avviserò appena i dati saranno precisi 🔔' : 
          savings >= 50 ? `Risparmi circa ${savings.toFixed(0)} €/anno, pari a ~${savingsPercent}% della spesa attuale.` :
          'Differenza minima rispetto alla tariffa attuale. Stabilità e trasparenza garantite.',
        prossimo_passo: i === 0 ? 'Vedi i dettagli e attiva in 1 click' : 'Confronta con altre offerte'
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
