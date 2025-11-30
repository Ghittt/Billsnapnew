require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase keys");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log("Starting A2A Test Case...");

  // 1. Create Upload (without tipo_bolletta)
  const { data: upload, error: uploadError } = await supabase
    .from('uploads')
    .insert({
      file_url: 'test-a2a.pdf',
      file_type: 'application/pdf',
      file_size: 2048,
      ocr_status: 'success'
    })
    .select()
    .single();

  if (uploadError) {
    console.error("Upload creation failed:", uploadError);
    return;
  }
  console.log(`Created upload: ${upload.id}`);

  // 2. Insert OCR Data (A2A, 5068 kWh, 1450€)
  const { error: ocrError } = await supabase
    .from('ocr_results')
    .insert({
      upload_id: upload.id,
      provider: "A2A Energia",
      annual_kwh: 5068,
      total_cost_eur: 1450,
      f1_kwh: 1600,
      f2_kwh: 1600,
      f3_kwh: 1868,
      quality_score: 1.0
    });

  if (ocrError) {
    console.error("OCR insertion failed:", ocrError);
    return;
  }
  console.log("Inserted OCR data (A2A, 5068 kWh, 1450€)");

  // 3. Call compare-offers
  console.log("Calling compare-offers (OpenAI)...");
  const { data, error } = await supabase.functions.invoke('compare-offers', {
    body: { uploadId: upload.id }
  });

  if (error) {
    console.error("Function error:", error);
  } else {
    console.log("\n--- AI Analysis Result ---");
    console.log("Success:", data.ok);
    
    if (data.ok) {
      console.log("\n[Best Offer]");
      console.log(`Provider: ${data.best?.provider}`);
      console.log(`Plan: ${data.best?.plan_name}`);
      console.log(`Simulated Cost: ${data.best?.simulated_cost}€`);
      console.log(`Savings: ${data.best?.savings}€`);
      console.log(`Reason: ${data.best?.reason}`);

      console.log("\n[Runner Up]");
      console.log(`Provider: ${data.runnerUp?.provider}`);
      console.log(`Plan: ${data.runnerUp?.plan_name}`);
      console.log(`Savings: ${data.runnerUp?.savings}€`);

      console.log("\n[Third Option]");
      console.log(`Provider: ${data.thirdOption?.provider}`);
      console.log(`Plan: ${data.thirdOption?.plan_name}`);
      console.log(`Savings: ${data.thirdOption?.savings}€`);
      
      console.log("\n[Profile Analysis]");
      console.log(JSON.stringify(data.profile, null, 2));
    } else {
      console.error("Error message:", data.error);
    }
  }
}

runTest();
