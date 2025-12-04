require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log("Checking recent uploads and comparison results...\n");
  
  // Get latest uploads
  const { data: uploads, error: uploadsError } = await supabase
    .from('uploads')
    .select('id, created_at, ocr_status')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (uploadsError) {
    console.error("Uploads error:", uploadsError);
    return;
  }
  
  console.log(`Found ${uploads.length} recent uploads:\n`);
  
  for (const upload of uploads) {
    console.log(`Upload ID: ${upload.id}`);
    console.log(`Created: ${upload.created_at}`);
    console.log(`OCR Status: ${upload.ocr_status}`);
    
    // Check OCR results
    const { data: ocr } = await supabase
      .from('ocr_results')
      .select('provider, annual_kwh, consumo_annuo_smc')
      .eq('upload_id', upload.id)
      .maybeSingle();
      
    if (ocr) {
      console.log(`OCR: ${ocr.provider}, ${ocr.annual_kwh || ocr.consumo_annuo_smc} kWh/Smc`);
    } else {
      console.log(`OCR: Not found`);
    }
    
    // Check comparison results
    const { data: comparison } = await supabase
      .from('comparison_results')
      .select('id, ranked_offers')
      .eq('upload_id', upload.id)
      .maybeSingle();
      
    if (comparison) {
      const offers = comparison.ranked_offers || [];
      console.log(`Comparison: ${offers.length} offers`);
    } else {
      console.log(`Comparison: Not found`);
    }
    
    console.log('---\n');
  }
}

debug();
