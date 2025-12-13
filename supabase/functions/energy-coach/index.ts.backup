// @ts-nocheck
/**
 * Energy Coach v5.3 - Professional Friend Edition (Clean Style)
 * 
 * Provides professional, human-like energy analysis with Pros/Cons.
 * Uses Gemini 1.5 Flash (stable) as primary model.
 */

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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY_2') || Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { 
      upload_id, 
      consumo_annuo_kwh, 
      spesa_mensile_corrente, 
      spesa_annua_corrente, 
      fornitore_attuale,
      tipo_offerta_attuale,
      f1_consumption,
      f2_consumption,
      f3_consumption,
      current_price_kwh,
      offerta_fissa,
      offerta_variabile,
      scenario_con_bonus,
      isee_basso,
      eta_utente,
      nucleo_familiare
    } = await req.json();

    // Context Building
    const calcSavings = (offer) => {
      if (!offer || !offer.costo_annuo) return { annual: 0, monthly: 0 };
      const annual = spesa_annua_corrente - offer.costo_annuo;
      return { annual, monthly: annual / 12 };
    };

    const fixedSavings = calcSavings(offerta_fissa);
    const variableSavings = calcSavings(offerta_variabile);

    let offerteFissaSection = "Nessuna offerta a prezzo fisso disponibile.";
    if (offerta_fissa && offerta_fissa.costo_annuo) {
      offerteFissaSection = `
- **Nome:** ${offerta_fissa.nome_offerta || offerta_fissa.plan_name}
- **Fornitore:** ${offerta_fissa.fornitore || offerta_fissa.provider}
- **Costo Annuo:** €${offerta_fissa.costo_annuo?.toFixed(2)}
- **Risparmio:** €${fixedSavings.annual.toFixed(2)}/anno`;
    }

    let offerteVariabileSection = "Nessuna offerta a prezzo variabile disponibile.";
    if (offerta_variabile && offerta_variabile.costo_annuo) {
      offerteVariabileSection = `
- **Nome:** ${offerta_variabile.nome_offerta || offerta_variabile.plan_name}
- **Fornitore:** ${offerta_variabile.fornitore || offerta_variabile.provider}
- **Costo Annuo:** €${offerta_variabile.costo_annuo?.toFixed(2)}
- **Risparmio:** €${variableSavings.annual.toFixed(2)}/anno`;
    }

    let bonusSection = "";
    if (isee_basso && scenario_con_bonus) {
      bonusSection = `
SCENARIO BONUS:
- Risparmio con bonus: €${scenario_con_bonus.risparmio_annuo_con_bonus?.toFixed(2) || 'N/A'}`;
    }

    // Determine Logic prior to prompt to guide AI
    
    const systemPrompt = `Sei l'Energy Coach di BillSnap: un amico esperto, professionale ma informale (dai del tu).
Il tuo obiettivo è analizzare la bolletta e dare un consiglio schietto e utile.

DATI UTENTE:
- Spesa attuale: €${Number(spesa_mensile_corrente).toFixed(2)}/mese (€${Number(spesa_annua_corrente).toFixed(2)}/anno)
- Consumo annuo: ${consumo_annuo_kwh} kWh
- Fornitore attuale: ${fornitore_attuale}
- Fasce orarie: F1: ${f1_consumption||0}, F2: ${f2_consumption||0}, F3: ${f3_consumption||0} kWh

MIGLIORI OFFERTE TROVATE:
1. FISSO: ${offerteFissaSection}
2. VARIABILE: ${offerteVariabileSection}
${bonusSection}

LINEE GUIDA PERSONA:
1. **Tono**: Amichevole, diretto, empatico. Professionalità pulita. Evita emoji eccessivi o infantili.
2. **Analisi Fasce**: Spiega brevemente le fasce F1/F2/F3 solo se rilevante per il risparmio.
3. **Pro & Contro**: Elenca i punti di forza e debolezza in modo oggettivo.
4. **Verdetto**:
   - Se risparmio > 50€: CONSIGLIA DI CAMBIARE.
   - Se risparmio < 30€: Sii onesto sul basso impatto.
   - Se paga poco: Complimentati.
5. **COMPLETEZZA**: Concludi sempre il ragionamento.

STRUTTURA RISPOSTA (Markdown):

#### Analisi dei tuoi consumi
[Spiegazione chiara e pulita del consumo.]

#### Pro e Contro delle opzioni
**Se resti con ${fornitore_attuale}:**
- Paghi circa €${Number(spesa_annua_corrente).toFixed(0)} all'anno.
- [Svantaggi/Vantaggi principali]

**Se passi all'offerta migliore (${offerta_fissa?.provider || offerta_variabile?.provider || 'nuovo fornitore'}):**
- **Risparmi circa €${Math.max(fixedSavings.annual, variableSavings.annual).toFixed(0)} all'anno.**
- [Vantaggi principali es. Prezzo bloccato]
- [Eventuali attenzioni]

#### Consiglio dell'esperto
[Verdetto finale netto e professionale.]

#### Cosa devi fare ora
1. Clicca su **Attiva Offerta Online** per bloccare il prezzo.
2. Tieni a portata di mano IBAN e dati intestatario.
3. La procedura è automatica e senza interruzioni.

IMPORTANTE: Stile pulito, niente pallini colorati, niente emoji nel corpo del testo (salvo titoli). Massima leggibilità.`;

    const callGemini = async (modelId) => {
       const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
       const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { 
                temperature: 0.4, 
                maxOutputTokens: 1000, 
            }
          }),
        });
        if (!response.ok) throw new Error(await response.text());
        return response.json();
    };

    let analysis = null;
    let modelUsed = "";

    try {
        // 1. Try Gemini 1.5 Flash (Most stable currently)
        const data = await callGemini("gemini-1.5-flash");
        analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;
        modelUsed = "gemini-1.5-flash";
    } catch (e) {
        console.warn("Gemini 1.5 Flash failed, trying Pro", e);
        try {
            // 2. Fallback to Gemini 1.5 Pro
            const data = await callGemini("gemini-1.5-pro");
            analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;
            modelUsed = "gemini-1.5-pro";
        } catch (e2) {
             console.warn("Gemini 1.5 Pro failed, trying 2.0 Flash", e2);
             try {
                // 3. Fallback to Gemini 2.0 Flash (Experimental)
                const data = await callGemini("gemini-2.0-flash-exp");
                analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;
                modelUsed = "gemini-2.0-flash-exp";
             } catch (e3) {
                 // Final fallback
                 throw new Error("All Gemini models failed.");
             }
        }
    }

    if (!analysis) {
      throw new Error('All Gemini models failed to generate response');
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        analysis,
        model_used: modelUsed
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Energy Coach error:', error);
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
