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

    const { profile, offers } = await req.json();

    if (!profile || !offers || !Array.isArray(offers) || offers.length === 0) {
      throw new Error('profile and offers array are required');
    }

    console.log('Generating AI explanations for', offers.length, 'offers');

    const systemPrompt = `Sei un assistente energia esperto che spiega le offerte in modo SEMPLICE e UMANO.

STILE DI COMUNICAZIONE:
- Usa un tono amichevole e diretto, come se parlassi a un amico
- Spiega le FASCE ORARIE in modo comprensibile:
  * F1 (picco): lunedì-venerdì 8-19, quando consumi di più costa di più
  * F2 (intermedia): mattino presto e sera tardi dei giorni feriali, sabato
  * F3 (fuori picco): notte, domenica e festivi, quando l'energia costa meno
- Mostra DOVE si risparmia rispetto alla bolletta attuale
- Usa esempi concreti e numeri reali
- NON inventare numeri, usa SOLO quelli forniti

Per OGNI offerta, rispondi con JSON in questo formato:
{
  "offer_id": "id_dell_offerta",
  "headline": "Titolo breve e chiaro (es: 'Ideale se consumi di sera')",
  "simple_explanation": "Spiegazione in 2-3 frasi semplici che chiunque capisca, includendo le fasce orarie se rilevanti",
  "why_this_price": "Perché costa così: spiega in modo umano come si arriva al costo totale",
  "best_for": "Per chi è perfetta questa offerta (es: 'famiglie che usano elettrodomestici la sera')",
  "savings_vs_current": numero_risparmio_rispetto_bolletta_attuale_o_null
}

Fornisci un array di questi oggetti, uno per ogni offerta.`;

    // Calcola il costo attuale stimato dalla bolletta
    const currentCost = offers[0].current_cost_eur || (profile.total_kwh_year * 0.30);

    const userContent = `Profilo consumo dell'utente:
- Consumo annuo totale: ${profile.total_kwh_year} kWh
- Fascia F1 (picco, lun-ven 8-19): ${(profile.f1_share * 100).toFixed(0)}% = ${Math.round(profile.total_kwh_year * profile.f1_share)} kWh
- Fascia F2 (intermedia): ${(profile.f2_share * 100).toFixed(0)}% = ${Math.round(profile.total_kwh_year * profile.f2_share)} kWh  
- Fascia F3 (fuori picco, notte/weekend): ${(profile.f3_share * 100).toFixed(0)}% = ${Math.round(profile.total_kwh_year * profile.f3_share)} kWh
- Potenza impegnata: ${profile.potenza_kw} kW
- Costo bolletta attuale stimato: ${currentCost.toFixed(0)}€/anno

Offerte da spiegare:
${offers.map((o: any, i: number) => `
${i + 1}. ${o.provider} - ${o.plan_name}
   - ID: ${o.offer_id}
   - Tipo tariffa: ${o.tariff_type}
   - Prezzo F1: ${o.price_f1 || o.price_kwh}€/kWh
   - Prezzo F2: ${o.price_f2 || o.price_kwh}€/kWh
   - Prezzo F3: ${o.price_f3 || o.price_kwh}€/kWh
   - Quota fissa: ${o.fee_month}€/mese
   - Costo totale annuo: ${o.total_year}€
   ${i === 0 ? '★ MIGLIORE OFFERTA' : ''}
`).join('\n')}

Spiega ogni offerta in modo comprensibile, evidenziando:
1. Se ha prezzi diversi per fascia oraria e cosa significa per l'utente
2. Quanto si risparmia rispetto alla bolletta attuale (${currentCost.toFixed(0)}€)
3. Per quale tipo di consumatore è più adatta`;

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
      // Fallback responses for each offer
      const currentCost = offers[0].current_cost_eur || (profile.total_kwh_year * 0.30);
      parsed = offers.map((offer: any, i: number) => ({
        offer_id: offer.offer_id,
        headline: i === 0 ? 'La scelta più conveniente' : 'Alternativa valida',
        simple_explanation: `Offerta ${offer.tariff_type} di ${offer.provider} con costo annuo di ${offer.total_year}€.`,
        why_this_price: `Il costo include ${offer.fee_month}€/mese di quota fissa più il consumo di energia.`,
        best_for: 'Utenti domestici',
        savings_vs_current: i === 0 ? Math.round(currentCost - offer.total_year) : null
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
