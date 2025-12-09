import { config } from "dotenv";
import fs from "fs";

config({ path: ".env" });

const PROD_FUNCTION_URL = "https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/ocr-extract";
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_OCR_SUPABASE_ANON_KEY;

// Use a real PDF if possible, or a minimal dummy
const TEST_FILE = "test-bill-debug.pdf"; 

async function debugProd() {
    console.log(`Pinging PRODUCTION: ${PROD_FUNCTION_URL}`);
    
    // Create dummy PDF if not exists
    if (!fs.existsSync(TEST_FILE)) {
      console.log("Creating dummy PDF...");
      fs.writeFileSync(TEST_FILE, "Dummy PDF Content for Debugging");
    }

    const fileBuffer = fs.readFileSync(TEST_FILE);
    const base64 = fileBuffer.toString("base64");
    const uploadId = "debug-prod-" + Date.now();

    try {
        const res = await fetch(PROD_FUNCTION_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                fileBase64: base64,
                fileName: "debug_prod.pdf",
                fileType: "application/pdf",
                uploadId: uploadId
            })
        });

        console.log(`Status: ${res.status} ${res.statusText}`);
        const text = await res.text();
        console.log("Response Body:");
        console.log(text);
        
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

debugProd();
