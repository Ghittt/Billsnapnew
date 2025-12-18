import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Cleaning up invalid offers...");

    // 1. Delete from offers_live
    const { count: countLive, error: errorLive } = await supabase
        .from('offers_live')
        .delete({ count: 'exact' })
        .ilike('nome_offerta', '%Enel Black%');
    
    if(errorLive) console.error("Error cleaning offers_live:", errorLive);
    console.log(`Deleted ${countLive} from offers_live`);

    // 2. Delete from offers_scraped
    const { count: countScraped, error: errorScraped } = await supabase
        .from('offers_scraped')
        .delete({ count: 'exact' })
        .ilike('plan_name', '%Enel Black%');

    if(errorScraped) console.error("Error cleaning offers_scraped:", errorScraped);
    console.log(`Deleted ${countScraped} from offers_scraped`);

    return new Response(JSON.stringify({ 
        success: true, 
        deleted_live: countLive, 
        deleted_scraped: countScraped 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
