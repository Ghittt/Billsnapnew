import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jxluygtonamgadqgzgyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOcrData() {
    const { data, error } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('upload_id', 'test-upload-realistic-bill')
        .maybeSingle();
    
    if (error) {
        console.error("Error:", error);
        return;
    }
    
    console.log("OCR Data for test upload:");
    console.log(JSON.stringify(data, null, 2));
}

checkOcrData();
