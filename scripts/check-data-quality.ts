import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jxluygtonamgadqgzgyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkData() {
    console.log("--- OFFERS LIVE (Last 3) ---");
    const { data: offers, error: err1 } = await supabase
        .from('offers_live')
        .select('*')
        .order('scraped_at', { ascending: false })
        .limit(3);
    
    if (err1) console.error("Offers Error:", err1);
    else console.log(JSON.stringify(offers, null, 2));

    console.log("\n--- OCR RESULTS (Last 3) ---");
    const { data: ocr, error: err2 } = await supabase
        .from('ocr_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (err2) console.error("OCR Error:", err2);
    else console.log(JSON.stringify(ocr, null, 2));
}

checkData();
