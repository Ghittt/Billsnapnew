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

const euroPerKwh = (text: string): number | null => {
  const m = String(text).match(/(\d+[.,]\d{3,4}|\d+[.,]\d{1,2})\s*€?\s*\/?\s*kWh/i);
  return m ? norm(m[1]) : null;
};

async function scrapeGeneric(url: string, provider: string, planName: string, fixedFeeYear: number = 0) {
  try {
    console.log(`Scraping ${provider} from ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    
    // Simple text extraction without full DOM parsing
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');

    let price = null;
    
    // Look for price patterns in the text
    const pricePatterns = [
      /(\d+[.,]\d{2,4})\s*€?\s*\/?\s*kWh/gi,
      /(\d+[.,]\d{2,4})\s*cent\w*\s*\/?\s*kWh/gi,
    ];

    for (const pattern of pricePatterns) {
      const matches = textContent.matchAll(pattern);
      for (const match of matches) {
        const p = norm(match[1]);
        if (p > 0.1 && p < 2) { // Reasonable price range
          price = p;
          break;
        }
      }
      if (price) break;
    }

    console.log(`${provider}: found price ${price} €/kWh`);

    return {
      provider,
      plan_name: planName,
      commodity: 'power',
      unit_price_eur_kwh: price,
      fixed_fee_eur_mo: Math.round(fixedFeeYear / 12 * 100) / 100,
      pricing_type: 'fixed',
      source: 'scraper',
      is_active: true,
      valid_from: new Date().toISOString().split('T')[0],
      valid_to: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days validity
      redirect_url: url
    };
  } catch (error) {
    console.error(`Error scraping ${provider}:`, error);
    return null;
  }
}

async function runScraper() {
  const targets = [
    ["https://www.enel.it/it/luce-e-gas/luce", "Enel Energia", "E-Light Luce", 102],
    ["https://www.sorgenia.it/offerte-luce", "Sorgenia", "Next Energy Luce", 114],
    ["https://www.edisonenergia.it/offerte-luce", "Edison Energia", "Luce Prezzo Fisso", 120],
    ["https://www.irenlucegas.it/luce", "Iren Luce e Gas", "Luce Prezzo Fisso", 108],
    ["https://www.a2aenergia.eu/it/luce", "A2A Energia", "Luce Prezzo Fisso", 118.8],
  ];

  const results = [];
  
  for (const [url, provider, planName, fixedFeeYear] of targets) {
    const result = await scrapeGeneric(String(url), String(provider), String(planName), Number(fixedFeeYear));
    if (result && result.unit_price_eur_kwh) {
      results.push(result);
    }
    
    // Add delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 2000));
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

    // Deactivate all existing scraped offers
    await supabase
      .from('offers')
      .update({ is_active: false })
      .eq('source', 'scraper');

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
        unit_price_eur_kwh: offer.unit_price_eur_kwh,
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