/**
 * Scrape Single Offer - FINAL WORKING VERSION
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlApiKey) throw new Error('FIRECRAWL_API_KEY not configured');
    if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');

    console.log('[SCRAPE] Starting:', url);

    // Firecrawl with JavaScript rendering
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
        timeout: 30000
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('[SCRAPE] Firecrawl error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Firecrawl failed', details: errorText }),
        { status: firecrawlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlData = await firecrawlResponse.json();
    const scrapedContent = firecrawlData.data?.markdown || '';
    
    if (!scrapedContent) {
      return new Response(
        JSON.stringify({ error: 'No content extracted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SCRAPE] Extracted ${scrapedContent.length} chars`);

    // Gemini analysis
    const geminiPrompt = `Analizza questo contenuto da un sito di offerte energetiche italiane.
Estrai TUTTE le offerte luce/gas che trovi.

Per ogni offerta:
- nome_offerta: nome commerciale
- provider: fornitore
- commodity: "luce", "gas", o "dual"
- prezzo_kwh: €/kWh per luce
- prezzo_smc: €/Smc per gas
- quota_fissa_mensile: canone mensile €
- tipo_prezzo: "fisso", "variabile", "indicizzato"
- green_energy: true se rinnovabile
- note: promozioni/condizioni

CONTENUTO:
${scrapedContent.substring(0, 15000)}

Rispondi SOLO JSON:
{
  "offerte": [{"nome_offerta": "...", "provider": "...", "commodity": "luce", "prezzo_kwh": 0.12, "quota_fissa_mensile": 8.5, "tipo_prezzo": "fisso", "green_energy": false, "note": "..."}]
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[SCRAPE] Gemini error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Gemini failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse JSON
    let normalizedData;
    try {
      const jsonMatch = geminiText.match(/```json\n?([\s\S]*?)\n?```/) || 
                       geminiText.match(/```\n?([\s\S]*?)\n?```/) ||
                       [null, geminiText];
      const jsonText = jsonMatch[1] || geminiText;
      normalizedData = JSON.parse(jsonText.trim());
    } catch (e) {
      console.error('[SCRAPE] JSON parse error:', e);
      return new Response(
        JSON.stringify({ error: 'JSON parse failed', raw: geminiText.substring(0, 1000) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SCRAPE] Found ${normalizedData.offerte?.length || 0} offers`);

    // Save to Supabase
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    const offersToSave = normalizedData.offerte || [];
    const savedOffers = [];

    for (const offer of offersToSave) {
      const offerRecord = {
        provider: offer.provider || 'Unknown',
        plan_name: offer.nome_offerta || 'Unnamed',
        commodity: offer.commodity || 'luce',
        price_kwh: offer.commodity === 'luce' ? offer.prezzo_kwh : null,
        unit_price_eur_smc: offer.commodity === 'gas' ? offer.prezzo_smc : null,
        fixed_fee_eur_mo: offer.quota_fissa_mensile || 0,
        pricing_type: offer.tipo_prezzo || 'variabile',
        is_green: offer.green_energy || false,
        notes: offer.note,
        scraped_url: url,
        raw_data: { original: offer, date: new Date().toISOString() }
      };

      console.log(`[SCRAPE] Saving: ${offerRecord.provider} - ${offerRecord.plan_name}`);

      // Simple insert (no upsert to avoid constraint issues)
      const { data, error } = await supabase
        .from('offers_scraped')
        .insert(offerRecord)
        .select()
        .single();

      if (error) {
        console.error('[SCRAPE] Insert error:', error.message);
        // Continue with other offers
      } else {
        savedOffers.push(data);
        console.log(`[SCRAPE] ✓ Saved: ${data.id}`);
      }
    }

    console.log(`[SCRAPE] COMPLETE: ${savedOffers.length}/${offersToSave.length} saved`);

    return new Response(
      JSON.stringify({
        success: true,
        url: url,
        offers_found: offersToSave.length,
        offers_saved: savedOffers.length,
        saved_offers: savedOffers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[SCRAPE] FATAL:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
