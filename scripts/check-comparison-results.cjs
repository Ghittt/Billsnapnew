require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking comparison_results table...");
  
  const { data, error } = await supabase
    .from('comparison_results')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(`Found ${data?.length || 0} results`);
    if (data && data.length > 0) {
      console.log("\nLatest result:");
      console.log(JSON.stringify(data[0], null, 2));
    }
  }
}

check();
