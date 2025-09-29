import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  timestamp: string;
  status: 'PASS' | 'FAIL';
  tests: {
    scraper_test: {
      status: 'PASS' | 'FAIL';
      offers_count: number;
      duration_ms: number;
      error?: string;
    };
    best_offer_test: {
      status: 'PASS' | 'FAIL';
      provider?: string;
      price_kwh?: number;
      annual_cost?: number;
      duration_ms: number;
      error?: string;
    };
    database_test: {
      status: 'PASS' | 'FAIL';
      active_offers_count: number;
      error?: string;
    };
  };
  kpis: {
    num_offers: number;
    best_provider?: string;
    best_price_kwh?: number;
    best_annual_cost?: number;
    updated_at?: string;
  };
}

async function runHealthCheck(): Promise<HealthCheckResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const result: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    status: 'PASS',
    tests: {
      scraper_test: { status: 'PASS', offers_count: 0, duration_ms: 0 },
      best_offer_test: { status: 'PASS', duration_ms: 0 },
      database_test: { status: 'PASS', active_offers_count: 0 }
    },
    kpis: { num_offers: 0 }
  };

  // Test 1: Scraper Test
  console.log('Running scraper test...');
  const scraperStart = Date.now();
  try {
    const scraperResponse = await fetch(`${supabaseUrl}/functions/v1/scrape-offers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const scraperData = await scraperResponse.json();
    result.tests.scraper_test.duration_ms = Date.now() - scraperStart;

    if (scraperResponse.ok && scraperData.scraped_count >= 3) {
      result.tests.scraper_test.status = 'PASS';
      result.tests.scraper_test.offers_count = scraperData.scraped_count;
    } else {
      result.tests.scraper_test.status = 'FAIL';
      result.tests.scraper_test.error = `Only ${scraperData.scraped_count || 0} offers scraped (need ≥3)`;
      result.status = 'FAIL';
    }
  } catch (error) {
    result.tests.scraper_test.status = 'FAIL';
    result.tests.scraper_test.error = error instanceof Error ? error.message : String(error);
    result.tests.scraper_test.duration_ms = Date.now() - scraperStart;
    result.status = 'FAIL';
  }

  // Wait a moment for database to be updated
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Database Test
  console.log('Running database test...');
  try {
    const { data: activeOffers, error } = await supabase
      .from('offers')
      .select('*')
      .eq('is_active', true)
      .eq('source', 'scraper');

    if (error) throw error;

    result.tests.database_test.active_offers_count = activeOffers?.length || 0;
    
    if ((activeOffers?.length || 0) >= 3) {
      result.tests.database_test.status = 'PASS';
    } else {
      result.tests.database_test.status = 'FAIL';
      result.tests.database_test.error = `Only ${activeOffers?.length || 0} active offers in database`;
      result.status = 'FAIL';
    }
  } catch (error) {
    result.tests.database_test.status = 'FAIL';
    result.tests.database_test.error = error instanceof Error ? error.message : String(error);
    result.status = 'FAIL';
  }

  // Test 3: Best Offer Test
  console.log('Running best offer test...');
  const bestOfferStart = Date.now();
  try {
    const bestOfferResponse = await fetch(`${supabaseUrl}/functions/v1/get-best-offer?commodity=power&annual_kwh=2700`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    const bestOfferData = await bestOfferResponse.json();
    result.tests.best_offer_test.duration_ms = Date.now() - bestOfferStart;

    if (bestOfferResponse.ok && bestOfferData.provider) {
      const price = bestOfferData.unit_price_eur_kwh;
      const annualCost = bestOfferData.offer_annual_cost_eur;

      // Validate price range (0.10 - 0.80 €/kWh)
      if (price >= 0.10 && price <= 0.80 && annualCost > 100 && annualCost < 5000) {
        result.tests.best_offer_test.status = 'PASS';
        result.tests.best_offer_test.provider = bestOfferData.provider;
        result.tests.best_offer_test.price_kwh = price;
        result.tests.best_offer_test.annual_cost = annualCost;

        // Set KPIs
        result.kpis.best_provider = bestOfferData.provider;
        result.kpis.best_price_kwh = price;
        result.kpis.best_annual_cost = annualCost;
      } else {
        result.tests.best_offer_test.status = 'FAIL';
        result.tests.best_offer_test.error = `Price out of range: ${price} €/kWh or cost ${annualCost} invalid`;
        result.status = 'FAIL';
      }
    } else {
      result.tests.best_offer_test.status = 'FAIL';
      result.tests.best_offer_test.error = bestOfferData.error || 'No best offer returned';
      result.status = 'FAIL';
    }
  } catch (error) {
    result.tests.best_offer_test.status = 'FAIL';
    result.tests.best_offer_test.error = error instanceof Error ? error.message : String(error);
    result.tests.best_offer_test.duration_ms = Date.now() - bestOfferStart;
    result.status = 'FAIL';
  }

  // Set final KPIs
  result.kpis.num_offers = result.tests.database_test.active_offers_count;
  result.kpis.updated_at = new Date().toISOString();

  console.log('Health check completed:', result.status);
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting BillSnap health check...');
    
    const healthResult = await runHealthCheck();
    
    // Log the result for monitoring
    console.log('Health check result:', JSON.stringify(healthResult, null, 2));
    
    const status = healthResult.status === 'PASS' ? 200 : 500;
    
    return new Response(JSON.stringify({
      ...healthResult,
      summary: {
        overall_status: healthResult.status,
        tests_passed: Object.values(healthResult.tests).filter(t => t.status === 'PASS').length,
        tests_total: Object.keys(healthResult.tests).length,
        recommendations: healthResult.status === 'FAIL' ? [
          'Check scraper function logs for errors',
          'Verify provider websites are accessible',
          'Update scraping selectors if needed',
          'Check database connectivity'
        ] : ['All systems operational']
      }
    }, null, 2), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in health-check function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return new Response(JSON.stringify({ 
      timestamp: new Date().toISOString(),
      status: 'FAIL',
      error: errorMessage,
      tests: {
        system_test: { status: 'FAIL', error: errorMessage }
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});