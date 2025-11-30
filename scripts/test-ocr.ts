// scripts/test-ocr.ts
// Script "antistress" per testare l'OCR Billsnap da Antigravity

import fs from "fs";
import path from "path";

// Prende le variabili dall'ambiente di Antigravity
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jxluygtonamgadqgzgyh.supabase.co";
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_OCR_SUPABASE_ANON_KEY;
const FUNCTION_URL = process.env.VITE_OCR_FUNCTION_URL || "https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/ocr-extract";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !FUNCTION_URL) {
  throw new Error("Manca SUPABASE_URL, SUPABASE_ANON_KEY o FUNCTION_URL nelle env.");
}

// *** QUI METTI IL PERCORSO DEL PDF SUL MAC ***
const LOCAL_BILL_PATH = "/Users/giorgioarghittu/Desktop/Bolletta test.pdf";

// *** QUI PUOI CAMBIARE L'ID PER RICONOSCERE L'UPLOAD ***
const UPLOAD_ID = "test-antigravity-" + Date.now();

async function uploadBill() {
  console.log("1) Carico il file locale...");
  console.log("   Path:", LOCAL_BILL_PATH);

  if (!fs.existsSync(LOCAL_BILL_PATH)) {
    throw new Error(`File non trovato: ${LOCAL_BILL_PATH}`);
  }

  const fileBuffer = fs.readFileSync(LOCAL_BILL_PATH);
  const fileName = path.basename(LOCAL_BILL_PATH);

  console.log(`   File: ${fileName}, Size: ${fileBuffer.length} bytes`);

  // Node 18+ in Antigravity ha fetch / FormData / Blob globali
  const blob = new Blob([fileBuffer]);
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("uploadId", UPLOAD_ID);

  console.log("2) Invio alla edge function:", FUNCTION_URL);

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: formData,
  });

  const text = await res.text();
  console.log("Status funzione:", res.status);
  console.log("Body funzione:");
  console.log(text);

  if (!res.ok) {
    throw new Error("La funzione OCR ha risposto con errore, vedi sopra.");
  }

  return UPLOAD_ID;
}

async function readResults(uploadId: string) {
  console.log("\n3) Leggo i risultati da ocr_results...");

  const url = `${SUPABASE_URL}/rest/v1/ocr_results?select=*&upload_id=eq.${encodeURIComponent(
    uploadId
  )}`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });

  const json = await res.json();
  console.log("Status SELECT:", res.status);
  console.log("Rows trovate in ocr_results:");
  console.dir(json, { depth: null });
}

async function main() {
  try {
    console.log("=== TEST OCR BILLSNAP ===\n");
    console.log("Config:");
    console.log("  SUPABASE_URL:", SUPABASE_URL);
    console.log("  FUNCTION_URL:", FUNCTION_URL);
    console.log("  ANON_KEY:", SUPABASE_ANON_KEY?.substring(0, 20) + "...\n");

    const uploadId = await uploadBill();
    
    // piccola pausa di sicurezza per permettere l'insert
    console.log("\nAttendo 2 secondi per il completamento...");
    await new Promise((r) => setTimeout(r, 2000));
    
    await readResults(uploadId);
    
    console.log("\n✅ Test completato!");
  } catch (err) {
    console.error("\n❌ ERRORE GENERALE SCRIPT:", err);
    process.exit(1);
  }
}

main();
