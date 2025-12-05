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
      tipo_offerta_attuale,
      f1_consumption,
      f2_consumption,
      f3_consumption,
      current_price_kwh
    } = await req.json();

    if (!upload_id || !consumo_annuo_kwh || !spesa_mensile_corrente) {
      throw new Error('Missing required fields');
    }

    console.log('EnergyCoach: Processing analysis for upload:', upload_id);

    // Get comparison results
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

    const systemPrompt = `Sei l’AI ufficiale di BillSnap. La tua analisi DEVE sembrare fatta da un consulente umano esperto, non da un riepilogo di dati.

OBIETTIVO:
Produrre un’analisi “a prova di principiante”, lineare, comprensibile, senza termini tecnici inutili, andando dritto al punto.

DATI UTENTE:
- Spesa mensile attuale: €${Number(spesa_mensile_corrente).toFixed(2)}
- Spesa annua attuale: €${Number(spesa_annua_corrente).toFixed(2)}
- Consumo annuo: ${consumo_annuo_kwh} ${unitLabel}
- Consumo F1: ${f1_consumption || 0} ${unitLabel}
- Consumo F2: ${f2_consumption || 0} ${unitLabel}
- Consumo F3: ${f3_consumption || 0} ${unitLabel}
- Fornitore attuale: ${fornitore_attuale}
- Tipo offerta attuale: ${tipo_offerta_attuale || 'Non specificato'}
- Prezzo attuale kWh: €${current_price_kwh || 'N/A'}

OFFERTA MIGLIORE CONSIGLIATA:
- Nome: ${bestOffer?.plan_name || 'N/A'}
- Fornitore: ${bestOffer?.provider || 'N/A'}
- Spesa mensile stimata: €${bestOffer ? (bestOffer.simulated_cost / 12).toFixed(2) : 'N/A'}
- Spesa annua stimata: €${bestOffer?.simulated_cost.toFixed(2) || 'N/A'}
- Risparmio mensile: €${monthlySavings.toFixed(2)}
- Risparmio annuo: €${annualSavings.toFixed(2)}
- Prezzo offerta kWh: €${bestOffer?.price_kwh || 'N/A'}
- Link offerta: ${bestOffer?.redirect_url || '#'}

REGOLE DI OUTPUT:
1. Parla SEMPRE come se stessi spiegando a una persona che non capisce nulla di energia.
2. Usa frasi brevi, chiare, pulite.
3. Non usare gergo tecnico senza spiegarlo.
4. Devi SEMPRE spiegare PERCHÉ l’offerta consigliata è migliore PER QUEL consumo.
5. Devi SEMPRE analizzare le fasce orarie F1, F2, F3 e spiegarne il senso.
6. Devi SEMPRE includere un pulsante “Sottoscrivi l’offerta” usando il link fornito.
7. Devi SEMPRE spiegare se l’utente consuma molto, poco o nella media.
8. Devi SEMPRE evidenziare se l’offerta attuale è sbilanciata rispetto al profilo di consumo.
9. Devi dare consigli concreti (es. elettrodomestici energivori, fasce sbagliate, ecc.).
10. NO FRASEGGI GENERICI. NO MINCHIATE.

STRUTTURA OBBLIGATORIA DELL’ANALISI:

### 1. Diagnosi immediata (apertura)
Spiega in modo diretto:
- quanto spende ora l’utente
- quanto spenderebbe con l’offerta consigliata
- la differenza
- se il risparmio è significativo, marginale o nullo

### 2. Perché questa offerta è migliore (la parte AI vera)
Qui devi essere chirurgico:
- confronta il tipo di tariffa (monoraria/bioraria)
- guarda i consumi F1/F2/F3 e spiega se l’offerta si adatta bene o male
- spiega se l’utente consuma più nelle fasce costose = errore del contratto attuale
- spiega se l’offerta proposta ha prezzo fisso più stabile
- spiega se l’utente ha elettrodomestici energivori

### 3. Analisi fasce orarie (F1, F2, F3)
DEVI spiegare:
- quale fascia pesa di più
- se l’offerta consigliata è più conveniente in quella fascia
- quanto potrebbe influire un cambio abitudini

### 4. Analisi del consumo totale
Classifica sempre:
- Sotto 2500 kWh → Consumo basso
- 2500–4500 kWh → Consumo medio
- 4500–7000 kWh → Consumo alto
- Oltre 7000 kWh → Consumo molto alto

E spiega perché questo incide sulle offerte.

### 5. Cosa devi fare adesso (azione concreta)
Tre punti semplicissimi e pratici.

### 6. Pulsante di sottoscrizione
Obbligatorio:
[ **Sottoscrivi l’offerta** ](${bestOffer?.redirect_url || '#'})

### 7. Trasparenza (breve e onesta)
Aggiungi SEMPRE una nota chiara:
“Le cifre sono stime basate sui tuoi consumi reali e sui prezzi attuali. Controlla sempre i dettagli sul sito del fornitore prima di sottoscrivere.”

Rispondi SEMPRE in italiano perfetto, con tono professionale ma amichevole. Usa Markdown.`;

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
            maxOutputTokens: 1500,
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
