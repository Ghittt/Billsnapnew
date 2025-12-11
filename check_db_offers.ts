import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkOffers() {
  console.log("Checking offers_live...");
  const { data: live, error: liveError } = await supabase
    .from('offers_live')
    .select('*')
    .ilike('nome_offerta', '%Enel Black%');

  if (liveError) console.error("Error live:", liveError);
  console.log("Live Matches:", live);

  console.log("\nChecking offers_scraped...");
  const { data: scraped, error: scrapedError } = await supabase
    .from('offers_scraped')
    .select('*')
    .ilike('plan_name', '%Enel Black%');

   if (scrapedError) {
       console.error("Error scraped:", scrapedError);
   }
   console.log("Scraped Matches:", scraped);
}

checkOffers();
