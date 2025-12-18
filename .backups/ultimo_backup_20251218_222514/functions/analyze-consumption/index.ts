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

    const { ocrData, uploadId, userProfile, billType } = await req.json();

    if (!ocrData) {
      throw new Error('ocrData is required');
    }

    console.log('Analyzing consumption for upload:', uploadId);

    const tipo = billType || 'luce';
    const consumption = tipo === 'gas' 
      ? (ocrData.consumo_annuo_smc || ocrData.gas_smc || 1200)
      : (ocrData.annual_kwh || 2700);
    const unitLabel = tipo === 'gas' ? 'Smc' : 'kWh';
    const priceUnit = tipo === 'gas' 
      ? (ocrData.prezzo_gas_eur_smc || 0)
      : (ocrData.unit_price_eur_kwh || 0);
    const costoAnnuo = ocrData.costo_annuo_totale || ocrData.total_cost_eur || consumption * 0.30;

    // Media nazionale di riferimento
    const mediaNazionale = tipo === 'gas' ? 1200 : 2700; // Media italiana per famiglia
    const differenzaPercentuale = ((consumption - mediaNazionale) / mediaNazionale * 100).toFixed(0);

    // Analisi fasce orarie (solo per luce)
    let fasce = null;
    if (tipo === 'luce') {
      const f1 = ocrData.f1_kwh || 0;
      const f2 = ocrData.f2_kwh || 0;
      const f3 = ocrData.f3_kwh || 0;
      const totale = f1 + f2 + f3;

      if (totale > 0) {
        const f1Percent = (f1 / totale * 100).toFixed(0);
        const f2Percent = (f2 / totale * 100).toFixed(0);
        const f3Percent = (f3 / totale * 100).toFixed(0);

        fasce = {
          f1_kwh: f1,
          f2_kwh: f2,
          f3_kwh: f3,
          f1_percent: f1Percent,
          f2_percent: f2Percent,
          f3_percent: f3Percent,
          fascia_prevalente: f1 > f2 && f1 > f3 ? 'F1 (ore di punta)' : 
                            f3 > f1 && f3 > f2 ? 'F3 (ore serali/weekend)' : 
                            'F2 (ore intermedie)'
        };
      }
    }

    // Anomaly detection
    const anomalie = [];
    
    // Anomalia 1: Consumo molto alto
    if (consumption > mediaNazionale * 1.5) {
      anomalie.push({
        tipo: 'consumo_elevato',
        severita: 'warning',
        messaggio: `Il tuo consumo annuale (${consumption} ${unitLabel}) è del ${Math.abs(Number(differenzaPercentuale))}% superiore alla media nazionale`
      });
    }

    // Anomalia 2: Consumo molto basso
    if (consumption < mediaNazionale * 0.5) {
      anomalie.push({
        tipo: 'consumo_basso',
        severita: 'info',
        messaggio: `Il tuo consumo annuale (${consumption} ${unitLabel}) è del ${Math.abs(Number(differenzaPercentuale))}% inferiore alla media nazionale`
      });
    }

    // Anomalia 3: Prezzo unitario alto (solo se disponibile)
    if (tipo === 'luce' && priceUnit > 0.35) {
      anomalie.push({
        tipo: 'prezzo_alto',
        severita: 'warning',
        messaggio: `Il tuo prezzo unitario (${priceUnit.toFixed(3)} €/kWh) è superiore alla media di mercato`
      });
    }

    // Anomalia 4: F1 troppo alta (solo per luce)
    if (fasce && Number(fasce.f1_percent) > 50) {
      anomalie.push({
        tipo: 'f1_alta',
        severita: 'warning',
        messaggio: `Consumi principalmente in fascia F1 (${fasce.f1_percent}%), la più costosa. Considera una tariffa bioraria.`
      });
    }

    // Build user context
    let userContext = "";
    if (userProfile) {
      const familyInfo = [];
      if (userProfile.family_size > 1) familyInfo.push(`famiglia di ${userProfile.family_size} persone`);
      if (userProfile.work_from_home) familyInfo.push(`lavoro da casa`);
      if (userProfile.heating_type === 'pompa_calore') familyInfo.push(`riscaldamento con pompa di calore`);
      if (familyInfo.length > 0) {
        userContext = `\n\nPROFILO UTENTE:\n- ${familyInfo.join('\n- ')}`;
      }
    }

    const systemPrompt = `Sei SnapAI™, il consulente energetico di BillSnap che analizza i consumi reali degli utenti.

Il tuo compito è analizzare i dati della bolletta ${tipo === 'gas' ? 'gas' : 'luce'} e fornire un'analisi chiara, onesta e utile, SEMPRE con focus sul risparmio MENSILE.

REGOLA FONDAMENTALE: IL RISPARMIO MENSILE È IL DATO PRINCIPALE
- Prima riga: SEMPRE il risparmio mensile (€/mese)
- Seconda riga: traduzione nella vita reale (spesa, benzina, rata, ecc.)
- Terza riga: risparmio annuale come dato a supporto
- Vietato mostrare solo il risparmio annuale ignorando i mesi
- Usa formule come "stimiamo", "circa" - nessuna promessa assoluta

TONO DI VOCE:
- Empatico e realistico
- Diretto e pratico
- Semplice, senza tecnicismi
- Mai arrogante o pubblicitario
- Motivante ma sincero
- Linguaggio del "fine mese": quanto resta in tasca ogni mese

LINEE GUIDA:
- Parla come un consulente umano che capisce le preoccupazioni reali
- Usa esempi concreti del quotidiano: "circa una spesa al supermercato", "un pieno di benzina", "una piccola rata"
- Evidenzia anomalie e picchi in modo costruttivo
- Fornisci suggerimenti pratici e attuabili
- Evita linguaggio marketing: no "gratis", "incredibile", "straordinario"
- NO emoji eccessivi
- NO punti esclamativi multipli (!!!)

TIPO BOLLETTA: ${tipo.toUpperCase()}${userContext}

STRUTTURA OBBLIGATORIA della risposta in JSON:

{
  "sintesi": "2-3 frasi che riassumono la situazione complessiva in modo umano e diretto",
  
  "cosa_capito": "Spiegazione chiara di cosa ho estratto dalla bolletta (fornitore, consumo, costo MENSILE e annuale). Linguaggio semplice.",
  
  "spesa_mensile_attuale": {
    "importo_mese": ${(costoAnnuo / 12).toFixed(0)},
    "importo_anno": ${costoAnnuo.toFixed(0)},
    "messaggio": "Spiegazione empatica: Paghi in media X €/mese (Y €/anno). Collega alla vita reale."
  },
  
  "quanto_spendi": "Analisi della spesa attuale MENSILE con confronto media nazionale. Focus sul 'quanto mi costa al mese'. Se superiore/inferiore, spiegare perché in modo empatico.",
  
  "fasce_orarie": ${tipo === 'luce' && fasce ? `{
    "prevalente": "${fasce.fascia_prevalente}",
    "distribuzione": "F1: ${fasce.f1_percent}%, F2: ${fasce.f2_percent}%, F3: ${fasce.f3_percent}%",
    "suggerimento": "Consiglio pratico basato sulla distribuzione (es. se F1 alta, suggerisci spostare consumi o tariffa bioraria)",
    "impatto_mensile": "Quanto pesa al mese questa distribuzione (es. 'circa 15-20 € al mese in più rispetto a una tariffa ottimizzata')"
  }` : 'null'},
  
  "risparmio_potenziale": {
    "mensile": "Risparmio mensile stimato in € (es. 'circa 50-60 € al mese')",
    "annuale": "Risparmio annuale come dato a supporto (es. 'pari a circa 600-720 € all'anno')",
    "vita_reale": "Traduzione nella vita quotidiana (es. 'più o meno una spesa al supermercato ogni mese' o 'un pieno di benzina in meno')",
    "messaggio_completo": "Frase completa che parte dal mensile: 'Cambiando offerta, potresti risparmiare circa X € al mese (Y € all'anno), che equivalgono a [vita_reale]'"
  },
  
  "consiglio_pratico": "UN solo consiglio concreto e immediato che l'utente può applicare (es. spostare lavaggi, controllare elettrodomestici, ecc.)",
  
  "confronto_nazionale": {
    "messaggio": "Frase che confronta il consumo dell'utente con la media nazionale (${mediaNazionale} ${unitLabel}), usando un tono empatico e focus su quanto costa al mese"
  },
  
  "anomalie": ${anomalie.length > 0 ? JSON.stringify(anomalie) : '[]'},
  
  "conclusione": "SEMPRE: Stessa energia, meno stress. BillSnap pensa al resto."
}

ESEMPIO DI TONO CORRETTO (focus mensile):
"Paghi in media 95 € al mese (circa 1.140 € all'anno). Cambiando offerta, potresti scendere a circa 60 € al mese, risparmiando 35 € ogni mese. Sono più o meno una spesa al supermercato in meno, senza cambiare nulla delle tue abitudini."

ESEMPIO DI TONO SBAGLIATO:
"Il tuo consumo energetico annuale risulta essere significativamente superiore alla media nazionale. Ti consigliamo di valutare immediatamente un cambio di fornitore per beneficiare di straordinarie opportunità di risparmio pari a 420 euro all'anno!"

RICORDA: Parti SEMPRE dal mensile, poi aggiungi l'annuale come supporto.`;

    const userContent = `Analizza questa bolletta ${tipo}:

DATI BOLLETTA:
- Fornitore: ${ocrData.provider || 'non specificato'}
- Consumo annuo: ${consumption} ${unitLabel}
- Prezzo unitario: ${priceUnit > 0 ? `${priceUnit.toFixed(3)} €/${unitLabel}` : 'non disponibile'}
- Costo annuo totale: ${costoAnnuo.toFixed(0)} €
- Potenza (solo luce): ${ocrData.potenza_kw || 3} kW

${fasce ? `DISTRIBUZIONE FASCE ORARIE:
- F1 (ore di punta 8-19 lun-ven): ${fasce.f1_kwh} kWh (${fasce.f1_percent}%)
- F2 (ore intermedie): ${fasce.f2_kwh} kWh (${fasce.f2_percent}%)
- F3 (sera/weekend): ${fasce.f3_kwh} kWh (${fasce.f3_percent}%)
- Fascia prevalente: ${fasce.fascia_prevalente}` : ''}

CONFRONTO NAZIONALE:
- Media nazionale: ${mediaNazionale} ${unitLabel}
- Differenza: ${differenzaPercentuale}% ${Number(differenzaPercentuale) > 0 ? 'superiore' : 'inferiore'}

ANOMALIE RILEVATE:
${anomalie.length > 0 ? anomalie.map(a => `- ${a.messaggio}`).join('\n') : 'Nessuna anomalia significativa'}

Genera un'analisi completa e utile nel formato JSON richiesto.`;

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
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a few moments.');
      }
      if (response.status === 402) {
        throw new Error('AI service credits exhausted. Please contact support.');
      }
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Empty AI response');
    }

    console.log('Consumption analysis generated successfully');

    let parsed;
    try {
      parsed = JSON.parse(content);
      
      // Anti-marketing filter
      const bannedWords = ['gratis', 'regalo', 'festa', 'incredibile', 'straordinario', 'fantastico'];
      const fullText = JSON.stringify(parsed).toLowerCase();
      const needsRegeneration = bannedWords.some(word => fullText.includes(word));

      if (needsRegeneration) {
        console.warn('AI output contained banned marketing words, using fallback');
        throw new Error('Marketing tone detected');
      }
    } catch (e) {
      console.error('Failed to parse AI response or marketing tone detected');
      
      // Fallback structure
      parsed = {
        sintesi: `Ho analizzato la tua bolletta ${tipo}. Consumi ${consumption} ${unitLabel} all'anno, che è ${Math.abs(Number(differenzaPercentuale))}% ${Number(differenzaPercentuale) > 0 ? 'sopra' : 'sotto'} la media nazionale.`,
        cosa_capito: `Fornitore: ${ocrData.provider || 'non specificato'}. Consumo annuo: ${consumption} ${unitLabel}. ${priceUnit > 0 ? `Prezzo: ${priceUnit.toFixed(3)} €/${unitLabel}.` : ''} Costo annuo: circa ${costoAnnuo.toFixed(0)} €.`,
        quanto_spendi: `Spendi circa ${costoAnnuo.toFixed(0)} € all'anno. ${Number(differenzaPercentuale) > 20 ? 'Un po\' più della media, ma potrebbe essere normale per la tua situazione.' : 'In linea con i consumi medi.'}`,
        fasce_orarie: fasce ? {
          prevalente: fasce.fascia_prevalente,
          distribuzione: `F1: ${fasce.f1_percent}%, F2: ${fasce.f2_percent}%, F3: ${fasce.f3_percent}%`,
          suggerimento: Number(fasce.f1_percent) > 50 ? 
            'Consumi principalmente in ore di punta. Prova a spostare lavatrici e lavastoviglie la sera.' :
            'Distribuzione equilibrata dei consumi. Continua così.'
        } : null,
        risparmio_potenziale: 'Sto cercando offerte più convenienti per te. Ti mostro i risultati tra poco.',
        consiglio_pratico: anomalie.length > 0 ? anomalie[0].messaggio : 'Continua a monitorare i consumi per identificare eventuali sprechi.',
        confronto_nazionale: {
          messaggio: `Consumi ${consumption} ${unitLabel} all'anno, mentre la media italiana è ${mediaNazionale} ${unitLabel}. ${Math.abs(Number(differenzaPercentuale))}% ${Number(differenzaPercentuale) > 0 ? 'in più' : 'in meno'}.`
        },
        anomalie: anomalie,
        conclusione: 'Stessa energia, meno stress. BillSnap pensa al resto.'
      };
    }

    // Add raw data for reference
    const enrichedResponse = {
      ...parsed,
      raw_data: {
        consumption,
        unit: unitLabel,
        annual_cost: costoAnnuo,
        price_unit: priceUnit,
        national_average: mediaNazionale,
        diff_percentage: differenzaPercentuale,
        fasce: fasce
      }
    };

    return new Response(JSON.stringify(enrichedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-consumption function:', error);
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
