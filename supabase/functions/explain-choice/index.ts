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

    const { profile, best, runnerUp } = await req.json();

    if (!profile || !best) {
      throw new Error('profile and best offer are required');
    }

    console.log('Generating AI explanation for best offer:', best.offer_id);

    const systemPrompt = `Sei un consulente energia esperto. Spiega in modo chiaro e onesto PERCHÉ l'offerta migliore è più conveniente.

Usa SOLO i numeri forniti:
- Consumo annuo kWh e distribuzione per fascia (F1/F2/F3)
- Prezzi €/kWh per fascia
- Quota fissa mensile
- Potenza impegnata

IMPORTANTE:
- NON inventare stime o numeri
- Spiega il calcolo in modo trasparente
- Usa bullet points chiari
- Includi il risparmio annuale totale

Rispondi SOLO con JSON valido in questo formato:
{
  "headline": "Breve titolo accattivante del risparmio",
  "bullets": [
    "Punto 1 con calcolo specifico",
    "Punto 2 con dettaglio prezzi",
    "Punto 3 con confronto tariffe"
  ],
  "savings_per_year": numero_risparmio_in_euro,
  "explanation": "Spiegazione dettagliata del calcolo (2-3 frasi)"
}`;

    const userContent = runnerUp 
      ? `Profilo consumo:
- Consumo annuo: ${profile.total_kwh_year} kWh
- Fascia F1: ${(profile.f1_share * 100).toFixed(0)}%
- Fascia F2: ${(profile.f2_share * 100).toFixed(0)}%
- Fascia F3: ${(profile.f3_share * 100).toFixed(0)}%
- Potenza: ${profile.potenza_kw} kW

Offerta migliore (${best.provider} - ${best.plan_name}):
- Tipo tariffa: ${best.tariff_type}
- Costo energia: ${best.energy_year}€/anno
- Quota fissa: ${best.fee_year}€/anno
- Costo totale: ${best.total_year}€/anno

Seconda migliore (${runnerUp.provider} - ${runnerUp.plan_name}):
- Costo totale: ${runnerUp.total_year}€/anno

Spiega perché la prima è migliore della seconda.`
      : `Profilo consumo:
- Consumo annuo: ${profile.total_kwh_year} kWh
- Fascia F1: ${(profile.f1_share * 100).toFixed(0)}%
- Fascia F2: ${(profile.f2_share * 100).toFixed(0)}%
- Fascia F3: ${(profile.f3_share * 100).toFixed(0)}%
- Potenza: ${profile.potenza_kw} kW

Offerta migliore (${best.provider} - ${best.plan_name}):
- Tipo tariffa: ${best.tariff_type}
- Costo energia: ${best.energy_year}€/anno
- Quota fissa: ${best.fee_year}€/anno
- Costo totale: ${best.total_year}€/anno

Spiega i vantaggi di questa offerta.`;

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
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      // Fallback response
      parsed = {
        headline: `Risparmia ${runnerUp ? (runnerUp.total_year - best.total_year).toFixed(0) : '100'}€ all'anno`,
        bullets: [
          `Tariffa ${best.tariff_type} ottimizzata per il tuo consumo`,
          `Costo energia: ${best.energy_year}€/anno`,
          `Quota fissa: ${best.fee_year}€/anno`
        ],
        savings_per_year: runnerUp ? (runnerUp.total_year - best.total_year) : 100,
        explanation: `Con ${best.provider} paghi ${best.total_year}€/anno per ${profile.total_kwh_year} kWh.`
      };
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
