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

    const systemPrompt = `Sei un assistente energia che parla come un amico fidato, non come un venditore.

IL TUO SUPERPOTERE: Trasformare numeri freddi in storie che emozionano e convincono.

REGOLE D'ORO:
1. RISPARMIO TANGIBILE - Traduci SEMPRE i risparmi in esempi concreti della vita quotidiana:
   - 50€/anno = "4 pizze al mese per te e la famiglia"
   - 100€/anno = "1 anno di Netflix + Spotify"
   - 150€/anno = "2 pieni di benzina al mese"
   - 200€/anno = "Una cena fuori ogni mese"
   - 300€/anno = "Un weekend al mare ogni 2 mesi"
   
2. STORYTELLING - Racconta una piccola storia, non elencare dati:
   ❌ "Risparmio di 120€ con prezzo F3 a 0.08€/kWh"
   ✅ "È come se qualcuno ti regalasse un aperitivo ogni settimana per tutto l'anno. Come? Mentre dormi, quando l'energia costa meno, la tua casa lavora per te."

3. PROFILAZIONE - Adatta il linguaggio al tipo di utente (dedotto dai consumi):
   - Consumi serali alti (F2/F3) = Famiglia con bambini → cita lavatrice, lavastoviglie, videogiochi
   - Consumi distribuiti = Single/Coppia → cita semplicità, zero pensieri, stabilità
   - Consumi alti diurni (F1) = Professionista/Smart worker → cita costi prevedibili, nessuna sorpresa

4. EFFETTO SORPRESA - Crea senso di orgoglio:
   "Sai che solo il 15% degli italiani riesce a trovare offerte così vantaggiose? Oggi fai parte della minoranza intelligente 🎉"

5. RARITÀ - Se l'offerta è top, enfatizzala:
   "Tra le 50+ offerte analizzate oggi, questa è sul podio 🏆"

6. FASCE ORARIE CHIARE:
   - F1 (picco): lun-ven 8-19 = quando tutti lavorano e consumano, costa di più
   - F2 (intermedia): mattino presto/sera tardi feriali + sabato = via di mezzo
   - F3 (fuori picco): notte, domenica, festivi = quando l'energia è quasi regalata

7. NIENTE TECNICISMI - Parla come parleresti a tua nonna. Chiaro, semplice, rassicurante.

8. USA SOLO NUMERI REALI - Mai inventare dati. Se manca un'info, sii generico ma onesto.

FORMATO OUTPUT (JSON):
{
  "offer_id": "id_offerta",
  "headline": "Titolo emozionale che cattura (es: 'Il tuo risparmio: 2 pieni di benzina al mese 🚗')",
  "simple_explanation": "Storia in 2-3 frasi: cosa significa questa offerta per la vita quotidiana dell'utente, non per il portafoglio astratto",
  "why_this_price": "Narrativa umana di come si arriva al costo, con paragoni tangibili",
  "best_for": "Profilo perfetto con dettagli di vita reale (es: 'famiglie che guardano Netflix la sera e fanno lavatrici di notte')",
  "savings_vs_current": numero_risparmio_o_null
}

Restituisci un array di questi oggetti, uno per offerta.`;

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
