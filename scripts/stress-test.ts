import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import fs from "fs";
import path from "path";

config({ path: ".env" });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_OCR_SUPABASE_ANON_KEY;
const OCR_FUNCTION_TEST_URL = `${SUPABASE_URL}/functions/v1/ocr-extract`;
const SCRAPE_FUNCTION_TEST_URL = `${SUPABASE_URL}/functions/v1/sync-offers`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing credentials");
    process.exit(1);
}

const TEST_FILE_PATH = "test-bill.pdf";

async function runStressTest() {
    console.log("=== STARTING STRESS TEST ===");
    console.log(`Target: ${SUPABASE_URL}`);

    // 1. Prepare OCR Payload
    if (!fs.existsSync(TEST_FILE_PATH)) {
        console.error(`Test file not found: ${TEST_FILE_PATH}`);
        return;
    }
    const fileBuffer = fs.readFileSync(TEST_FILE_PATH);
    const base64 = fileBuffer.toString("base64");
    
    // 2. Run OCR Stress (5 concurrent requests)
    console.log("\n--- Phase 1: OCR Stress Test (5 concurrent) ---");
    const ocrPromises = Array(5).fill(0).map(async (_, i) => {
        const start = Date.now();
        const uploadId = `stress-test-${Date.now()}-${i}`;
        try {
            const res = await fetch(OCR_FUNCTION_TEST_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({
                    fileBase64: base64,
                    fileName: `stress_${i}.pdf`,
                    fileType: "application/pdf",
                    uploadId: uploadId
                })
            });
            const duration = Date.now() - start;
            if (res.ok) {
                console.log(`[OCR #${i}] SUCCESS in ${duration}ms`);
                return true;
            } else {
                console.error(`[OCR #${i}] FAILED: ${res.status} - ${await res.text()}`);
                return false;
            }
        } catch (e) {
            console.error(`[OCR #${i}] ERROR:`, e);
            return false;
        }
    });

    await Promise.all(ocrPromises);

    // 3. Run Scraping Stress (1 request - it's heavy)
    console.log("\n--- Phase 2: Scraping Stress Test ---");
    const startScrape = Date.now();
    try {
        const scrapeRes = await fetch(SCRAPE_FUNCTION_TEST_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({}) // Default scrapes all providers
        });
        const scrapeDuration = Date.now() - startScrape;
        if (scrapeRes.ok) {
            const json = await scrapeRes.json();
            console.log(`[SCRAPE] SUCCESS in ${scrapeDuration}ms`);
            console.log(`[SCRAPE] Offers Found: ${json.offers_found}, Saved: ${json.offers_saved}`);
        } else {
            console.error(`[SCRAPE] FAILED: ${scrapeRes.status} - ${await scrapeRes.text()}`);
        }
    } catch (e) {
        console.error(`[SCRAPE] ERROR:`, e);
    }
    
    console.log("\n=== TEST COMPLETED ===");
}

runStressTest();
