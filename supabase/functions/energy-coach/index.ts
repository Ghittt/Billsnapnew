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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      upload_id, 
      consumo_annuo_kwh, 
      spesa_mensile_corrente, 
      spesa_annua_corrente, 
      fornitore_attuale,
      tipo_offerta_attuale 
    } = await req.json();

    if (!upload_id || !consumo_annuo_kwh || !spesa_mensile_corrente) {
      throw new Error('Missing required fields');
    }

    console.log('EnergyCoach: Processing analysis for upload:', upload_id);

    // Get comparison results to understand savings potential
    const { data: comparisonData } = await supabaseClient
      .from('comparison_results')
      .select('*')
      .eq('upload_id', upload_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get upload type
    const { data: uploadData } = await supabaseClient
      .from('uploads')
      .select('tipo_bolletta')
      .eq('id', upload_id)
      .maybeSingle();

    const billType = uploadData?.tipo_bolletta || 'luce';
    const unitLabel = billType === 'gas' ? 'Smc' : 'kWh';

    // Calculate savings if we have comparison data
    let bestOffer = null;
    let annualSavings = 0;
    let monthlySavings = 0;

    if (comparisonData?.ranked_offers && Array.isArray(comparisonData.ranked_offers)) {
      const ranked = comparisonData.ranked_offers;
      if (ranked.length > 0) {
        bestOffer = ranked[0];
        annualSavings = spesa_annua_corrente - (bestOffer.simulated_cost || spesa_annua_corrente);
        monthlySavings = annualSavings / 12;
      }
    }

        // Build comprehensive prompt for Gemini
    const systemPrompt = `Sei SnapAI™, il consulente energetico intelligente di BillSnap.

Il tuo compito è fornire un'analisi personalizzata e professionale della situazione energetica dell'utente.

DATI UTENTE:
- Tipo bolletta: ${billType}
- Consumo annuo: ${consumo_annuo_kwh} ${unitLabel}
- Spesa mensile attuale: €${spesa_mensile_corrente.toFixed(2)}
- Spesa annua attuale: €${spesa_annua_corrente.toFixed(2)}
- Fornitore attuale: ${fornitore_attuale}
- Tipo offerta: ${tipo_offerta_attuale || 'Non specificato'}

${bestOffer ? `MIGLIOR OFFERTA TROVATA:
- Provider: ${bestOffer.provider}
- Piano: ${bestOffer.plan_name || 'N/A'}
- Costo annuo stimato: €${bestOffer.simulated_cost?.toFixed(2) || 'N/A'}
- Risparmio potenziale: €${annualSavings.toFixed(2)}/anno (€${monthlySavings.toFixed(2)}/mese)
` : 'NESSUNA OFFERTA MIGLIORE: La tariffa attuale è già competitiva.'}

TONO E STILE:
- Professionale ma accessibile
- Diretto e onesto
- Empatico e rassicurante
- ASSOLUTAMENTE NO EMOJI
- NO disclaimer generici
- NO frasi vaghe tipo "potrebbe" o "forse"

STRUTTURA DELLA RISPOSTA (Obbligatoria):
1. **Analisi Iniziale**: Valuta sinteticamente se il consumo è alto/basso/medio per il tipo di utenza.
2. **Valutazione Costi**: Giudica se la spesa attuale è in linea con il mercato o eccessiva.
3. **Il Verdetto**: Dì chiaramente se conviene cambiare o restare.
4. **Perché Cambiare (o Restare)**: Spiega i motivi matematici (es. "Risparmieresti X€ all'anno").
5. **Azione Consigliata**: Un invito all'azione chiaro (es. "Attiva subito l'offerta X" o "Tieni la tua tariffa").

LUNGHEZZA: Massimo 200 parole. Usa elenchi puntati se necessario per chiarezza.

Genera l'analisi in italiano, usando numeri concreti e fatti verificabili.`;


    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysis) {
      throw new Error('Empty AI response');
    }

    console.log('EnergyCoach: Analysis generated successfully');

    return new Response(
      JSON.stringify({ 
        ok: true, 
        analysis 
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
