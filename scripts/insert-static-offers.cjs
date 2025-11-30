require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Using anon key for inserts (RLS allows it now)

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase keys");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const staticOffers = [
  {
    provider: "Tate",
    plan_name: "Tate Luce Variabile",
    commodity: "luce",
    pricing_type: "variabile",
    price_kwh: 0.135, // Estimated average including PUN
    fixed_fee_eur_mo: 12,
    is_green: true,
    scraped_url: "https://tate.it/luce",
    raw_data: { source: "static_fallback", date: new Date().toISOString() }
  },
  {
    provider: "NeN",
    plan_name: "NeN Special 48",
    commodity: "luce",
    pricing_type: "fisso",
    price_kwh: 0.145,
    fixed_fee_eur_mo: 9,
    is_green: true,
    scraped_url: "https://nen.it/luce-gas",
    raw_data: { source: "static_fallback", date: new Date().toISOString() }
  },
  {
    provider: "Sorgenia",
    plan_name: "Next Energy Sunlight",
    commodity: "luce",
    pricing_type: "variabile",
    price_kwh: 0.132,
    fixed_fee_eur_mo: 10,
    is_green: true,
    scraped_url: "https://www.sorgenia.it/offerte-luce-gas",
    raw_data: { source: "static_fallback", date: new Date().toISOString() }
  }
];

async function run() {
  console.log("Inserting static offers...");
  
  for (const offer of staticOffers) {
    const { data, error } = await supabase
      .from('offers_scraped')
      .insert(offer)
      .select()
      .single();
      
    if (error) {
      console.error(`Error inserting ${offer.provider}:`, error.message);
    } else {
      console.log(`Inserted ${offer.provider} - ${offer.plan_name}`);
    }
  }
}

run();
