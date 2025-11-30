import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompare() {
  console.log("Testing compare-offers...");

  // 1. Check active offers
  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select('id, provider, plan_name, commodity, is_active, price_kwh, unit_price_eur_smc')
    .eq('is_active', true);

  if (offersError) {
    console.error("Error fetching offers:", offersError);
    return;
  }

  console.log(`Found ${offers?.length || 0} active offers:`);
  offers?.forEach(o => console.log(`- ${o.provider} (${o.commodity}): ${o.price_kwh || o.unit_price_eur_smc} €`));

  if (!offers || offers.length === 0) {
    console.error("NO ACTIVE OFFERS FOUND! This is why compare-offers fails.");
    return;
  }

  // 2. Create a dummy upload
  const { data: upload, error: uploadError } = await supabase
    .from('uploads')
    .insert({
      file_name: 'test-bill.pdf',
      file_type: 'application/pdf',
      file_size: 1024,
      tipo_bolletta: 'luce',
      ocr_status: 'success'
    })
    .select()
    .single();

  if (uploadError) {
    console.error("Error creating test upload:", uploadError);
    return;
  }

  const uploadId = upload.id;
  console.log(`Created test upload: ${uploadId}`);

  // 3. Insert dummy OCR results
  const { error: ocrError } = await supabase
    .from('ocr_results')
    .insert({
      upload_id: uploadId,
      annual_kwh: 2700,
      total_cost_eur: 900,
      provider: 'Test Provider',
      quality_score: 1.0
    });

  if (ocrError) {
    console.error("Error creating OCR results:", ocrError);
    return;
  }

  // 4. Call compare-offers function
  console.log("Invoking compare-offers...");
  const { data, error } = await supabase.functions.invoke('compare-offers', {
    body: { uploadId }
  });

  if (error) {
    console.error("Function error:", error);
  } else {
    console.log("Function response:", JSON.stringify(data, null, 2));
  }
}

testCompare();
