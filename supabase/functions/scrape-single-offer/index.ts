import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
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
    const googleApiKey = Deno.env.get('google_api_key');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!firecrawlApiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }
    if (!googleApiKey) {
      throw new Error('google_api_key not configured');
    }

    console.log('Starting scrape for URL:', url);

    // Step 1: Scrape with Firecrawl
    const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
    });

    if (!firecrawlResponse.ok) {
      const errorText = await firecrawlResponse.text();
      console.error('Firecrawl error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Firecrawl scraping failed',
          details: errorText,
          status: firecrawlResponse.status
        }),
        { status: firecrawlResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlData = await firecrawlResponse.json();
    console.log('Firecrawl response received');

    const scrapedContent = firecrawlData.data?.markdown || firecrawlData.data?.html || '';
    
    if (!scrapedContent) {
      return new Response(
        JSON.stringify({ error: 'No content extracted from page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Content extracted, length:', scrapedContent.length);

    // Step 2: Analyze with Gemini
    const geminiPrompt = `Analizza il seguente contenuto HTML/Markdown estratto da una pagina web di un fornitore energetico italiano.
Estrai e normalizza TUTTI i dati relativi alle offerte energia (luce e/o gas) presenti nella pagina.

Per ogni offerta trovata, estrai:
- nome_offerta: nome commerciale dell'offerta
- provider: nome del fornitore
- commodity: "power" per luce, "gas" per gas
- prezzo_kwh o prezzo_smc: prezzo unitario (in €/kWh per luce o €/Smc per gas)
- quota_fissa_mensile: quota fissa mensile in euro
- tipo_prezzo: "fisso" o "variabile"
- tipo_tariffa: "monoraria", "bioraria", "trioraria" (solo per luce)
- prezzi_fasce: se presenti prezzi per F1, F2, F3 (solo per luce)
- durata_contratto: durata minima del contratto se presente
- green_energy: true se energia verde/rinnovabile
- note_commerciali: eventuali sconti, bonus, promozioni

Se non trovi un dato, indica null. Se ci sono più offerte, restituisci un array.

CONTENUTO DA ANALIZZARE:
${scrapedContent.substring(0, 15000)}

Rispondi SOLO con un JSON valido nel seguente formato:
{
  "offerte": [
    {
      "nome_offerta": "...",
      "provider": "...",
      "commodity": "power",
      "prezzo_kwh": 0.15,
      "quota_fissa_mensile": 8.50,
      "tipo_prezzo": "fisso",
      "tipo_tariffa": "monoraria",
      "prezzi_fasce": { "f1": 0.16, "f2": 0.14, "f3": 0.13 },
      "durata_contratto": "12 mesi",
      "green_energy": true,
      "note_commerciali": "..."
    }
  ],
  "url_analizzato": "${url}",
  "data_estrazione": "${new Date().toISOString()}"
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: geminiPrompt }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Gemini analysis failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    console.log('Gemini response received, length:', geminiText.length);

    // Extract JSON from response (handle markdown code blocks)
    let normalizedData;
    try {
      const jsonMatch = geminiText.match(/```json\n?([\s\S]*?)\n?```/) || 
                       geminiText.match(/```\n?([\s\S]*?)\n?```/) ||
                       [null, geminiText];
      const jsonText = jsonMatch[1] || geminiText;
      normalizedData = JSON.parse(jsonText.trim());
    } catch (e) {
      console.error('JSON parsing error:', e);
      console.error('Gemini text:', geminiText);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse Gemini response as JSON',
          raw_response: geminiText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Save to Supabase
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);
    
    const offersToSave = normalizedData.offerte || [];
    const savedOffers = [];

    for (const offer of offersToSave) {
      const offerRecord = {
        provider: offer.provider || 'Unknown',
        plan_name: offer.nome_offerta || 'Unnamed offer',
        commodity: offer.commodity || 'power',
        price_kwh: offer.commodity === 'power' ? offer.prezzo_kwh : null,
        unit_price_eur_smc: offer.commodity === 'gas' ? offer.prezzo_smc : null,
        fixed_fee_eur_mo: offer.quota_fissa_mensile || 0,
        pricing_type: offer.tipo_prezzo || 'variable',
        tariff_type: offer.tipo_tariffa,
        price_f1: offer.prezzi_fasce?.f1,
        price_f2: offer.prezzi_fasce?.f2,
        price_f3: offer.prezzi_fasce?.f3,
        is_green: offer.green_energy || false,
        notes: offer.note_commerciali,
        scraped_url: url,
        raw_data: {
          original_data: offer,
          scraped_content_preview: scrapedContent.substring(0, 500),
          extraction_date: new Date().toISOString()
        }
      };

      const { data, error } = await supabase
        .from('offers_scraped')
        .insert(offerRecord)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
      } else {
        savedOffers.push(data);
        console.log('Offer saved:', data.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        url: url,
        offers_found: offersToSave.length,
        offers_saved: savedOffers.length,
        normalized_data: normalizedData,
        saved_offers: savedOffers
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scrape-single-offer:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
