import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions
const norm = (s: string | number): number => {
  return parseFloat(String(s).replace(",", ".").replace(/[^\d.]/g, ""));
};

async function scrapeWithFirecrawl(url: string, provider: string, planName: string, fixedFeeYear: number = 0, commodity: string = 'power') {
  try {
    console.log(`Scraping ${provider} from ${url} using Firecrawl`);
    
    const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlApiKey) {
      console.error('FIRECRAWL_API_KEY not found');
      return null;
    }

    // Use Firecrawl API directly
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${firecrawlApiKey}`
      },
      body: JSON.stringify({
        url: url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        timeout: 30000
      })
    });

    if (!scrapeResponse.ok) {
      const errorText = await scrapeResponse.text();
      console.error(`Firecrawl API error: ${scrapeResponse.status} - ${errorText}`);
      return null;
    }

    const scrapeResult = await scrapeResponse.json();
    
    if (!scrapeResult.success || !scrapeResult.data) {
      console.error('Firecrawl scraping failed:', scrapeResult);
      return null;
    }

    const textContent = scrapeResult.data.markdown || scrapeResult.data.html || '';
    console.log(`Scraped content length: ${textContent.length} chars`);

    let price = null;
    
    // Look for price patterns in the text
    const pricePatterns = commodity === 'power' 
      ? [
          /(\d+[.,]\d{2,4})\s*€?\s*\/?\s*kWh/gi,
          /(\d+[.,]\d{2,4})\s*cent\w*\s*\/?\s*kWh/gi,
          /prezzo\s*[:\s]*(\d+[.,]\d{2,4})\s*€?\s*\/?\s*kWh/gi,
        ]
      : [
          /(\d+[.,]\d{2,4})\s*€?\s*\/?\s*Smc/gi,
          /(\d+[.,]\d{2,4})\s*€?\s*\/?\s*m3/gi,
          /prezzo\s*[:\s]*(\d+[.,]\d{2,4})\s*€?\s*\/?\s*Smc/gi,
        ];

    for (const pattern of pricePatterns) {
      const matches = textContent.matchAll(pattern);
      for (const match of matches) {
        const p = norm(match[1]);
        const range = commodity === 'power' ? [0.1, 2] : [0.5, 5]; // Different ranges for power vs gas
        if (p > range[0] && p < range[1]) {
          price = p;
          break;
        }
      }
      if (price) break;
    }

    console.log(`${provider}: found price ${price} €/${commodity === 'power' ? 'kWh' : 'Smc'}`);

    const result: any = {
      provider,
      plan_name: planName,
      commodity,
      fixed_fee_eur_mo: Math.round(fixedFeeYear / 12 * 100) / 100,
      pricing_type: 'fixed',
      source: 'firecrawl',
      is_active: true,
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      redirect_url: url
    };

    if (commodity === 'power') {
      result.unit_price_eur_kwh = price;
    } else {
      result.unit_price_eur_smc = price;
    }

    return result;
  } catch (error) {
    console.error(`Error scraping ${provider} with Firecrawl:`, error);
    return null;
  }
}

async function runScraper() {
  // Expanded list of Italian energy providers - Luce (Power)
  const powerTargets = [
    ["https://www.enel.it/it/luce-e-gas/luce", "Enel Energia", "E-Light Luce", 102, 'power'],
    ["https://www.sorgenia.it/offerte-luce", "Sorgenia", "Next Energy Luce", 114, 'power'],
    ["https://www.edisonenergia.it/offerte-luce", "Edison Energia", "Luce Prezzo Fisso", 120, 'power'],
    ["https://www.irenlucegas.it/luce", "Iren Luce e Gas", "Luce Prezzo Fisso", 108, 'power'],
    ["https://www.a2aenergia.eu/it/luce", "A2A Energia", "Luce Prezzo Fisso", 118.8, 'power'],
    ["https://www.eni.com/it-IT/prodotti-servizi/energia-elettrica.html", "Eni Plenitude", "Link Luce", 96, 'power'],
    ["https://www.acea.it/elettricita", "Acea Energia", "Prezzo Fisso Luce", 105, 'power'],
    ["https://www.hera.it/gruppo/area-clienti/luce", "Hera Comm", "Hera Luce Fisso", 110, 'power'],
  ];

  // Gas targets
  const gasTargets = [
    ["https://www.enel.it/it/luce-e-gas/gas", "Enel Energia", "E-Light Gas", 102, 'gas'],
    ["https://www.sorgenia.it/offerte-gas", "Sorgenia", "Next Energy Gas", 114, 'gas'],
    ["https://www.edisonenergia.it/offerte-gas", "Edison Energia", "Gas Prezzo Fisso", 120, 'gas'],
    ["https://www.irenlucegas.it/gas", "Iren Luce e Gas", "Gas Prezzo Fisso", 108, 'gas'],
    ["https://www.a2aenergia.eu/it/gas", "A2A Energia", "Gas Prezzo Fisso", 118.8, 'gas'],
    ["https://www.eni.com/it-IT/prodotti-servizi/gas-naturale.html", "Eni Plenitude", "Link Gas", 96, 'gas'],
    ["https://www.acea.it/gas", "Acea Energia", "Prezzo Fisso Gas", 105, 'gas'],
    ["https://www.hera.it/gruppo/area-clienti/gas", "Hera Comm", "Hera Gas Fisso", 110, 'gas'],
  ];

  const allTargets = [...powerTargets, ...gasTargets];
  const results = [];
  
  for (const [url, provider, planName, fixedFeeYear, commodity] of allTargets) {
    const result = await scrapeWithFirecrawl(
      String(url), 
      String(provider), 
      String(planName), 
      Number(fixedFeeYear),
      String(commodity)
    );
    
    if (result && (result.unit_price_eur_kwh || result.unit_price_eur_smc)) {
      results.push(result);
    }
    
    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  return results;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting scraper run...');
    
    const scrapedOffers = await runScraper();
    
    if (scrapedOffers.length === 0) {
      console.log('No offers were successfully scraped');
      return new Response(JSON.stringify({ 
        error: 'No offers scraped successfully',
        scraped_count: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully scraped ${scrapedOffers.length} offers`);

    // Deactivate all existing Firecrawl scraped offers
    await supabase
      .from('offers')
      .update({ is_active: false })
      .in('source', ['scraper', 'firecrawl']);

    // Insert new scraped offers
    const { data: insertedOffers, error: insertError } = await supabase
      .from('offers')
      .insert(scrapedOffers)
      .select();

    if (insertError) {
      console.error('Error inserting scraped offers:', insertError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save scraped offers',
        details: insertError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Inserted ${insertedOffers?.length || 0} new offers`);

    return new Response(JSON.stringify({
      success: true,
      scraped_count: scrapedOffers.length,
      inserted_count: insertedOffers?.length || 0,
      offers: scrapedOffers.map(offer => ({
        provider: offer.provider,
        plan_name: offer.plan_name,
        commodity: offer.commodity,
        unit_price_eur_kwh: offer.unit_price_eur_kwh,
        unit_price_eur_smc: offer.unit_price_eur_smc,
        fixed_fee_eur_mo: offer.fixed_fee_eur_mo
      })),
      updated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scrape-offers function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});