import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jxluygtonamgadqgzgyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function createTestData() {
    const testUploadId = "test-upload-realistic-bill";
    
    // 1. Create upload record
    await supabase.from('uploads').upsert({
        id: testUploadId,
        tipo_bolletta: 'luce',
        status: 'completed'
    });
    
    // 2. Create OCR result (matching the user's screenshot: 3450 kWh, 1494€/year)
    await supabase.from('ocr_results').upsert({
        upload_id: testUploadId,
        annual_kwh: 3450,
        total_cost_eur: 1494,
        costo_annuo_totale: 1494,
        provider: 'a2a energia',
        tariff_hint: 'Prezzo Fisso',
        quality_score: 1.0
    });
    
    console.log("✅ Test data created for uploadId:", testUploadId);
}

createTestData();
