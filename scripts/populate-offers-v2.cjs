require('dotenv').config();

const SCRAPE_FUNCTION_URL = "https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/scrape-single-offer";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_ANON_KEY (checked VITE_SUPABASE_ANON_KEY, SUPABASE_ANON_KEY, VITE_SUPABASE_PUBLISHABLE_KEY)");
  process.exit(1);
}

const providers = [
  { name: "Tate", url: "https://tate.it/luce" },
  { name: "NeN", url: "https://nen.it/luce-gas" },
  { name: "Sorgenia", url: "https://www.sorgenia.it/offerte-luce-gas" },
  { name: "Hera Comm", url: "https://heracomm.gruppohera.it/casa/offerte-luce-gas" },
  { name: "E.ON", url: "https://www.eon-energia.com/offerte-luce-gas" }
];

async function scrapeProvider(provider) {
  console.log(`\nScraping ${provider.name} from ${provider.url}...`);
  try {
    const response = await fetch(SCRAPE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ url: provider.url })
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Error scraping ${provider.name}: ${response.status} - ${text}`);
      return;
    }

    const data = await response.json();
    console.log(`Success! Found ${data.offers_found} offers, saved ${data.offers_saved}.`);
    if (data.saved_offers && data.saved_offers.length > 0) {
      data.saved_offers.forEach(o => console.log(`- ${o.provider} - ${o.plan_name} (${o.commodity})`));
    }
  } catch (error) {
    console.error(`Exception scraping ${provider.name}:`, error.message);
  }
}

async function run() {
  console.log("Starting batch scraping...");
  for (const provider of providers) {
    await scrapeProvider(provider);
    // Wait 5 seconds between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  console.log("\nBatch scraping completed.");
}

run();
