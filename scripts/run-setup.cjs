require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSetup() {
  console.log("Calling setup-tables function...");
  
  const { data, error } = await supabase.functions.invoke('setup-tables', {
    body: {}
  });
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success!");
    console.log(JSON.stringify(data, null, 2));
  }
}

runSetup();
