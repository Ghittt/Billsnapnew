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

    const { profile, offers, userProfile, flags, billType, bestAbsolute, bestPersonalized, personalizationFactors } = await req.json();

    // Always-On: anche senza offers possiamo dare spiegazioni
    if (!offers || !Array.isArray(offers)) {
      throw new Error('offers array is required');
    }
    
    // Identify which offers to explain
    const isDifferent = bestAbsolute && bestPersonalized && bestAbsolute.offer_id !== bestPersonalized.offer_id;

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

    const systemPrompt = `Sei BillSnap, un consulente digitale amichevole e competente che aiuta l'utente a risparmiare sulla bolletta.
Il tuo tono deve essere empatico, realistico e motivante — mai eccessivamente tecnico o pubblicitario.

Scrivi una spiegazione breve, scorrevole e umana, come se parlassi direttamente all'utente.

${isDifferent ? `
IMPORTANTE: Devi spiegare DUE offerte diverse:
1️⃣ MIGLIORE IN ASSOLUTO: l'offerta con il prezzo più basso sul mercato (${bestAbsolute.provider} - ${bestAbsolute.plan_name})
2️⃣ MIGLIORE PER TE: l'offerta più adatta al profilo dell'utente considerando abitudini di consumo (${bestPersonalized.provider} - ${bestPersonalized.plan_name})

Per la "Migliore in assoluto" spiega:
- È la più economica in termini assoluti
- Quanto si risparmia
- Eventuali compromessi (es. "è monoraria ma consumi principalmente di sera")

Per la "Migliore per te" spiega:
- Perché si adatta meglio alle abitudini dell'utente
- Come ottimizza i consumi nelle fasce orarie prevalenti
- Il risparmio realistico considerando il profilo
` : `
Spiega l'offerta migliore trovata, che è sia la più economica che la più adatta al profilo dell'utente.
`}

TIPOLOGIA BOLLETTA: ${tipo.toUpperCase()} (${commodityLabel})

DATI DISPONIBILI:
- Fornitore attuale: ${profile?.provider_attuale || 'non disponibile'}
- Consumo annuo: ${consumption} ${unitLabel}
- Prezzo attuale: ${profile?.[priceLabel] || 'non disponibile'} €/${unitLabel}
- Quota fissa mensile: ${profile?.quota_fissa_mese || 'non disponibile'} €
- Migliore offerta trovata: ${offers.length > 0 ? offers[0].provider + ' - ' + offers[0].plan_name : 'nessuna'}
- Costo attuale annuo: ${currentCost.toFixed(0)}€
- Flags: price_missing=${priceMissing}, low_confidence=${lowConfidence}, already_best=${alreadyBest}, tier_consumi=${tierConsumi}

STRUTTURA OBBLIGATORIA:

${isDifferent ? `
Per CIASCUNA delle due offerte, fornisci:

**💰 [Migliore in assoluto / Migliore per te]**
1️⃣ **In breve:** Sintesi del vantaggio specifico
2️⃣ **Perché questa:** Spiega il vantaggio principale (prezzo basso assoluto o match con profilo)
3️⃣ **Risparmio:** Cifra concreta in €/anno
4️⃣ **Nota:** Eventuale compromesso o considerazione importante

` : `
1️⃣ **In breve:** Sintesi del vantaggio in modo diretto e naturale.

2️⃣ **Perché per te:** Spiega come questa offerta si adatta ai suoi consumi specifici e al suo profilo. Usa un linguaggio semplice e diretto, come se parlassi a un amico.

3️⃣ **Cosa non devi più fare:** Descrivi quale fatica o preoccupazione risparmia (es. "Dimentica i confronti infiniti tra tariffe" o "Niente più sorprese a fine mese").

4️⃣ **Numeri chiari:** Presenta il risparmio in modo tangibile e concreto. Se il risparmio è significativo (>50€), usa comparazioni realistiche come "circa {{X}} € all'anno" o "pari a circa {{Y}} mesi di bollette in meno". Se il dato è incerto o il risparmio minimo, sii onesto: "Differenza minima, ma con maggiore stabilità".
`}

REGOLE ESSENZIALI:
- Evita toni freddi o burocratici (mai dire "spesa annuale per l'energia elettrica", usa "bolletta").
- Non usare emoji (eccetto ⚡ se necessario per ${commodityLabel}).
- Non usare punti esclamativi multipli.
- Non usare parole come: gratis, regalo, festa, zero (quando implica "senza costi"), incredibile, straordinario, fantastico.
- Mantieni tono naturale e fluido, come un consulente che parla all'utente in modo amichevole e sicuro.
- Se il risparmio è < 50€, enfatizza la stabilità e la semplicità piuttosto che il guadagno.
- Se la tariffa attuale è già ottima, celebra la serenità: "Sei già su una delle migliori tariffe. BillSnap ti tiene aggiornato."
${typeSpecificGuidance}
${userContext}

CHIUSURA: Ogni spiegazione deve concludere con il messaggio: "Stessa energia, meno stress. BillSnap pensa al resto."

${isDifferent ? `
Restituisci un JSON con questa struttura:
{
  "migliore_assoluta": {
    "offer_id": "id_offerta",
    "categoria": "Migliore in assoluto",
    "emoji": "💰",
    "in_breve": "Sintesi vantaggio prezzo",
    "perche_questa": "Spiegazione prezzo più basso",
    "risparmio_anno": "Cifra in €",
    "nota": "Eventuale compromesso o considerazione",
    "conclusione": "Stessa energia, meno stress. BillSnap pensa al resto."
  },
  "migliore_personalizzata": {
    "offer_id": "id_offerta",
    "categoria": "Migliore per te",
    "emoji": "💡",
    "in_breve": "Sintesi match con profilo",
    "perche_questa": "Spiegazione adattamento abitudini",
    "risparmio_anno": "Cifra in €",
    "nota": "Vantaggio specifico per il profilo",
    "conclusione": "Stessa energia, meno stress. BillSnap pensa al resto."
  }
}
` : `
Restituisci un JSON array con un oggetto per ogni offerta. Ogni oggetto deve avere:
{
  "offer_id": "id_offerta",
  "headline": "Titolo chiaro e umano",
  "in_breve": "Sintesi del vantaggio",
  "perche_per_te": "Adattamento al profilo utente",
  "cosa_non_fare": "Quale fatica o preoccupazione risparmia",
  "numeri_chiari": "Risparmio concreto e tangibile",
  "prossimo_passo": "CTA chiara e umana",
  "conclusione": "Stessa energia, meno stress. BillSnap pensa al resto."
}
`}`;

    const userContent = `Profilo consumo dell'utente:
- Consumo annuo totale: ${consumption} ${unitLabel}
- Potenza: ${profile?.potenza_kw || 3} kW
- Tipo tariffa: ${profile?.tariff_type || 'monoraria'}
- Fascia prevalente: ${profile?.f1_share > 0.5 ? 'F1 (picco)' : profile?.f1_share < 0.25 ? 'F2-F3 (fuori picco)' : 'Bilanciato'}
- Costo attuale stimato: ${currentCost.toFixed(0)}€/anno

${isDifferent ? `
OFFERTA MIGLIORE IN ASSOLUTO (prezzo più basso):
- ${bestAbsolute.provider} - ${bestAbsolute.plan_name}
- ID: ${bestAbsolute.offer_id}
- Tipo: ${bestAbsolute.tariff_type || 'monoraria'}
- Prezzo: ${bestAbsolute.price_kwh || bestAbsolute.unit_price_eur_smc || 'n/d'}€/${unitLabel}
- Costo annuo: ${bestAbsolute.annual_cost_offer}€
- Risparmio: ${Math.max(0, currentCost - bestAbsolute.annual_cost_offer).toFixed(0)}€/anno

OFFERTA MIGLIORE PERSONALIZZATA (per profilo utente):
- ${bestPersonalized.provider} - ${bestPersonalized.plan_name}
- ID: ${bestPersonalized.offer_id}
- Tipo: ${bestPersonalized.tariff_type || 'monoraria'}
- Prezzo: ${bestPersonalized.price_kwh || bestPersonalized.unit_price_eur_smc || 'n/d'}€/${unitLabel}
- Costo annuo: ${bestPersonalized.annual_cost_offer}€
- Risparmio: ${Math.max(0, currentCost - bestPersonalized.annual_cost_offer).toFixed(0)}€/anno
- Motivo personalizzazione: ${personalizationFactors?.userPeakConsumption ? `Consumi prevalenti in ${personalizationFactors.userPeakConsumption}` : 'Match con profilo'}

Genera spiegazioni per ENTRAMBE le offerte nel formato richiesto.
` : `
Offerte da spiegare:
${offers.map((o: any, i: number) => `
${i + 1}. ${o.provider} - ${o.plan_name}
   - ID: ${o.offer_id}
   - Prezzo: ${o.price_kwh || o.unit_price_eur_smc || 'n/d'}€/${unitLabel}
   - Quota fissa: ${o.fee_month || 'n/d'}€/mese
   - Costo totale annuo: ${o.total_year || 'n/d'}€
   ${i === 0 ? '★ MIGLIORE OFFERTA' : ''}
`).join('\n')}
`}

Flags: ${JSON.stringify(detectedFlags)}

Spiega in modo comprensibile e umano.`;

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
          'Puoi ridurre leggermente la bolletta, restando su un piano semplice.') : 
          'Un\'altra opzione da considerare per i tuoi consumi.',
        perche_per_te: `Con ${consumption} ${unitLabel}/anno, questa offerta a prezzo ${offer.price_kwh || offer.unit_price_eur_smc ? 'fisso' : 'variabile'} garantisce ${tierConsumi === 'high' ? 'stabilità anche con consumi elevati' : 'semplicità e trasparenza'}.`,
        cosa_non_fare: 'Dimentica i confronti infiniti tra tariffe. BillSnap ti tiene aggiornato quando c\'è qualcosa di meglio.',
        numeri_chiari: priceMissing || !offer.total_year ? 
          'Differenza stimata di poche decine di euro/anno. Ti avviserò appena i dati saranno precisi.' : 
          savings >= 50 ? `Risparmi circa ${savings.toFixed(0)} €/anno, pari a circa ${savingsPercent}% della bolletta attuale.` :
          'Differenza minima rispetto alla tariffa attuale. Stabilità e trasparenza garantite.',
        prossimo_passo: i === 0 ? 'Vedi i dettagli e attiva in 1 click' : 'Confronta con altre offerte',
        conclusione: 'Stessa energia, meno stress. BillSnap pensa al resto.'
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
