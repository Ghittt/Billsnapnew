import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jxluygtonamgadqgzgyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUrls() {
    const { data, error } = await supabase
        .from('offers_live')
        .select('fornitore, nome_offerta, tipo, url_offerta')
        .eq('fornitore', 'Sorgenia')
        .order('scraped_at', { ascending: false })
        .limit(5);
    
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    console.log("Sorgenia URLs in database:\n");
    data?.forEach(offer => {
        console.log(`Offerta: ${offer.nome_offerta}`);
        console.log(`Tipo: ${offer.tipo}`);
        console.log(`URL: ${offer.url_offerta}`);
        console.log('---');
    });
}

checkUrls();
