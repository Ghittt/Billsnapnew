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

    const { profile, offers, userProfile } = await req.json();

    if (!profile || !offers || !Array.isArray(offers) || offers.length === 0) {
      throw new Error('profile and offers array are required');
    }

    console.log('Generating AI explanations for', offers.length, 'offers');

    // Costruisci informazioni sul profilo utente se disponibili
    let userContext = "";
    if (userProfile) {
      const familyInfo = [];
      if (userProfile.family_size > 1) {
        familyInfo.push(`famiglia di ${userProfile.family_size} persone`);
      }
      if (userProfile.has_children) {
        const ages = userProfile.children_ages || [];
        if (ages.length > 0) {
          familyInfo.push(`figli di ${ages.join(', ')} anni`);
        }
      }
      if (userProfile.work_from_home) {
        familyInfo.push(`lavoro da casa (alti consumi diurni F1)`);
      }
      if (userProfile.heating_type === 'pompa_calore') {
        familyInfo.push(`pompa di calore (impatto significativo sui consumi)`);
      }
      if (userProfile.main_appliances && userProfile.main_appliances.length > 0) {
        familyInfo.push(`elettrodomestici: ${userProfile.main_appliances.slice(0, 3).join(', ')}`);
      }

      if (familyInfo.length > 0) {
        userContext = `\n\nPROFILO UTENTE DETTAGLIATO:\n${familyInfo.join('\n- ')}\n\nUSA QUESTE INFORMAZIONI per personalizzare al massimo la spiegazione. Ad esempio:\n- Se ci sono bambini piccoli (0-5 anni): cita lavatrici frequenti, consumi notturni per lavatrice\n- Se ci sono ragazzi (12-18 anni): cita console, PC, streaming, uso serale alto\n- Se lavora da casa: enfatizza risparmio su F1 (fascia diurna)\n- Se ha pompa di calore: spiega impatto su consumi invernali e come l'offerta lo ottimizza\n- Se ha asciugatrice/lavastoviglie: suggerisci uso notturno in F3 per massimizzare risparmio`;
      }
    }

    const systemPrompt = `Sei un assistente energia che parla come un amico fidato, non come un venditore.

IL TUO SUPERPOTERE: Trasformare numeri freddi in storie che emozionano e convincono, utilizzando il profilo specifico dell'utente.

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

3. PROFILAZIONE AVANZATA - Adatta il linguaggio al profilo specifico dell'utente:
   - Famiglia con bambini piccoli → "Lavatrici di notte ti fanno risparmiare il costo di X pizze al mese"
   - Famiglia con adolescenti → "Console e PC accesi la sera? Con questa tariffa risparmi Y€ all'anno"
   - Chi lavora da casa → "Smart working significa PC, caffè, riscaldamento di giorno: questa offerta protegge la tua F1"
   - Con pompa di calore → "La tua pompa di calore d'inverno lavora tanto: ecco come ottimizzi i costi"

4. FASCE ORARIE SPIEGATE BENE - Usa esempi pratici:
   - F1 (picco, lun-ven 8-19): "Quando lavori, cucini, usi il PC"
   - F2 (intermedia): "Mattino presto, sera tardi, sabato"
   - F3 (fuori picco): "Di notte e domenica, quando l'energia costa poco"
   
5. CONFRONTO INTELLIGENTE TRA OFFERTE - Spiega perché questa è meglio:
   - "Offerta A ha F1 più basso → ideale se lavori da casa"
   - "Offerta B ha F3 molto conveniente → perfetta se fai lavatrice/lavastoviglie di notte"
   - "Offerta C è monoraria → meglio se consumi uguale tutto il giorno"
   
6. EFFETTO SORPRESA - Crea senso di orgoglio:
   "Sai che solo il 15% degli italiani riesce a trovare offerte così vantaggiose? Oggi fai parte della minoranza intelligente 🎉"

7. RARITÀ - Se l'offerta è top, enfatizzala:
   "Tra le 50+ offerte analizzate oggi, questa è sul podio 🏆"

8. USA SOLO NUMERI REALI - Mai inventare dati. Se manca un'info, sii generico ma onesto.

${userContext}

FORMATO OUTPUT (JSON):
{
  "offer_id": "id_offerta",
  "headline": "Titolo emozionale che cattura (es: 'Il tuo risparmio: 2 pieni di benzina al mese 🚗')",
  "simple_explanation": "Storia in 2-3 frasi: cosa significa questa offerta per la vita quotidiana SPECIFICA dell'utente, basandoti sul suo profilo",
  "why_this_price": "Narrativa umana di come si arriva al costo, con paragoni tangibili. SPIEGA perché questa offerta è ideale per le SUE fasce orarie",
  "best_for": "Descrizione personalizzata basata sul profilo reale dell'utente (non generica!)",
  "savings_vs_current": numero_risparmio_o_null,
  "tariff_recommendation": "Spiegazione chiara di quale fascia oraria (F1/F2/F3) sfruttare meglio basandoti sui suoi consumi e profilo"
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
