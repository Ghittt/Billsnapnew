// Test current Sorgenia URLs to see which ones work
const urls = [
  // Original from database
  'https://casa.sorgenia.it/content/sorgenia-fe/residential/home.html?productType=NESMART&commodity=DUAL&fibra=N&stepSimulazione=simulazioneSubscribe&campaign_code=sottoscrizione_commodity_res',
  
  // After our commodity fix
  'https://casa.sorgenia.it/content/sorgenia-fe/residential/home.html?productType=NESMART&commodity=LUCE&fibra=N&stepSimulazione=simulazioneSubscribe&campaign_code=sottoscrizione_commodity_res',
  
  // Simplified version
  'https://casa.sorgenia.it/content/sorgenia-fe/residential/home.html?productType=NESMART&commodity=LUCE',
  
  // Direct subscription page
  'https://casa.sorgenia.it/content/sorgenia-fe/residential/offerte/luce.html',
  
  // Main offers page
  'https://casa.sorgenia.it/offerte'
];

urls.forEach((url, i) => {
  console.log(`\n${i + 1}. Testing: ${url.substring(0, 80)}...`);
  console.log(`   Full URL: ${url}`);
});

console.log('\n⚠️  These URLs need manual testing in browser to verify which ones work.');
console.log('   The issue: complex URLs with many parameters often break when providers update their systems.');
