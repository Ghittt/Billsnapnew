import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jxluygtonamgadqgzgyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Import the getOfferUrl function logic directly for testing
function getOfferUrl(provider: string, planName: string): string {
  const p = (provider || '').toLowerCase().trim();
  
  // IMPORTANT: Check more specific names FIRST
  if (p.includes('sorgenia')) return 'https://www.sorgenia.it/offerte';
  if (p === 'eni' || p === 'plenitude' || p === 'eni plenitude' || p.includes('plenitude')) {
    return 'https://eniplenitude.com/offerte-luce-e-gas';
  }
  if (p.includes('pulsee')) return 'https://www.pulsee.it/';
  if (p.includes('enel')) return 'https://www.enel.it/it/luce-gas/offerte';
  if (p.includes('a2a')) return 'https://www.a2aenergia.eu/offerte';
  if (p.includes('edison')) return 'https://www.edison.it/offerte';
  if (p.includes('illumia')) return 'https://www.illumia.it/casa/';
  if (p.includes('wekiwi')) return 'https://www.wekiwi.it/casa/';
  if (p.includes('iren')) return 'https://www.irenlucegas.it/casa';
  if (p.includes('hera')) return 'https://www.heracomm.it/casa';
  if (p.includes('axpo')) return 'https://www.axpo.com/it/it/privati.html';
  if (p.includes('engie')) return 'https://www.engie.it/offerte';
  if (p.includes('acea')) return 'https://www.acea.it/offerte-luce-gas';
  if (p.includes('optima')) return 'https://www.optimaitalia.com/offerte';
  if (p.includes('green network')) return 'https://www.greennetworkenergy.it/offerte';
  if (p.includes('e.on') || p === 'eon') return 'https://www.eon-energia.com/offerte.html';
  if (p.includes('fastweb')) return 'https://www.fastweb.it/energia/';
  if (p.includes('duferco')) return 'https://www.dufercoenergia.com/';
  if (p.includes('servizio elettrico') || p === 'sen') return 'https://www.servizioelettriconazionale.it/';
  if (p.includes('tate')) return 'https://www.tate.it/';
  if (p.includes('alperia')) return 'https://www.alperia.eu/offerte';
  if (p.includes('dolomiti')) return 'https://www.dolomitienergia.it/casa';
  if (p.includes('cva')) return 'https://www.cva-energie.it/';
  if (p === 'nen' || p.includes('nen energia')) return 'https://nen.it/';
  if (p.includes('octopus')) return 'https://octopusenergy.it/';
  
  return 'FALLBACK_GOOGLE_SEARCH';
}

// Expected mappings for validation
const EXPECTED_MAPPINGS: Record<string, string> = {
  'Sorgenia': 'sorgenia.it',
  'Eni Plenitude': 'eniplenitude.com',
  'Eni': 'eniplenitude.com',
  'Plenitude': 'eniplenitude.com',
  'Enel': 'enel.it',
  'Enel Energia': 'enel.it',
  'A2A': 'a2aenergia.eu',
  'A2A Energia': 'a2aenergia.eu',
  'Edison': 'edison.it',
  'Edison Energia': 'edison.it',
  'Pulsee': 'pulsee.it',
  'Illumia': 'illumia.it',
  'Wekiwi': 'wekiwi.it',
  'Iren': 'irenlucegas.it',
  'Hera': 'heracomm.it',
  'Engie': 'engie.it',
  'Acea': 'acea.it',
  'E.ON': 'eon-energia.com',
  'Fastweb': 'fastweb.it',
  'Octopus': 'octopusenergy.it',
};

async function validateProviderUrls() {
  console.log('🔍 PROVIDER URL VALIDATION TEST\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];
  
  // Test 1: Static mapping tests
  console.log('\n📋 TEST 1: Static Provider Mappings\n');
  
  for (const [provider, expectedDomain] of Object.entries(EXPECTED_MAPPINGS)) {
    const url = getOfferUrl(provider, '');
    const urlContainsDomain = url.includes(expectedDomain);
    
    if (urlContainsDomain) {
      console.log(`  ✅ ${provider} → ${expectedDomain}`);
      passed++;
    } else {
      console.log(`  ❌ ${provider} → Expected: ${expectedDomain}, Got: ${url}`);
      errors.push(`${provider}: expected ${expectedDomain}, got ${url}`);
      failed++;
    }
  }
  
  // Test 2: Critical false-positive tests
  console.log('\n📋 TEST 2: False Positive Prevention\n');
  
  const falsePositiveTests = [
    { provider: 'Sorgenia', mustNotContain: 'eniplenitude', mustContain: 'sorgenia' },
    { provider: 'Enel Energia', mustNotContain: 'eniplenitude', mustContain: 'enel.it' },
    { provider: 'Engie Italia', mustNotContain: 'eniplenitude', mustContain: 'engie.it' },
  ];
  
  for (const test of falsePositiveTests) {
    const url = getOfferUrl(test.provider, '');
    const hasFalsePositive = url.includes(test.mustNotContain);
    const hasCorrectMatch = url.includes(test.mustContain);
    
    if (!hasFalsePositive && hasCorrectMatch) {
      console.log(`  ✅ ${test.provider} correctly avoids ${test.mustNotContain}`);
      passed++;
    } else {
      console.log(`  ❌ ${test.provider} FALSE POSITIVE: ${url}`);
      errors.push(`FALSE POSITIVE: ${test.provider} matched ${test.mustNotContain}`);
      failed++;
    }
  }
  
  // Test 3: Database providers
  console.log('\n📋 TEST 3: Database Provider Coverage\n');
  
  const { data: dbProviders, error } = await supabase
    .from('offers_live')
    .select('fornitore')
    .limit(100);
  
  if (error) {
    console.log('  ⚠️ Could not fetch database providers:', error.message);
  } else {
    const uniqueProviders = [...new Set(dbProviders?.map(o => o.fornitore) || [])];
    console.log(`  Found ${uniqueProviders.length} unique providers in database:\n`);
    
    for (const provider of uniqueProviders) {
      if (!provider) continue;
      const url = getOfferUrl(provider, '');
      const isFallback = url.includes('google.com/search');
      
      if (isFallback) {
        console.log(`  ⚠️ ${provider} → FALLBACK (no specific URL mapped)`);
      } else {
        console.log(`  ✅ ${provider} → ${new URL(url).hostname}`);
        passed++;
      }
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 SUMMARY\n');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  
  if (errors.length > 0) {
    console.log('\n🚨 ERRORS:\n');
    errors.forEach(e => console.log(`  - ${e}`));
    process.exit(1);
  } else {
    console.log('\n✅ ALL TESTS PASSED!\n');
    process.exit(0);
  }
}

validateProviderUrls();
