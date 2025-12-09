import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env" });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://jxluygtonamgadqgzgyh.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_OCR_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) throw new Error("Missing Supabase URL/Key");

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Checking ocr_results schema...");
    
    // Instead, let's just inspect one row.
    const { data, error } = await supabase.from("ocr_results").select("*").limit(1);
    
    if (error) {
        console.error("Error selecting *:", error);
    } else {
        if (data && data.length > 0) {
            console.log("Existing columns:", Object.keys(data[0]));
        } else {
            console.log("Table is empty, cannot infer columns easily from select.");
            // We can guess from error if we select non-existent column.
            const { error: colError } = await supabase.from("ocr_results").select("raw_json").limit(1);
            if (colError) console.error("Column raw_json check:", colError.message);
            else console.log("Column raw_json EXISTS.");
            
            const { error: typeError } = await supabase.from("ocr_results").select("tipo_fornitura").limit(1);
            if (typeError) console.error("Column tipo_fornitura check:", typeError.message);
            else console.log("Column tipo_fornitura EXISTS.");
        }
    }
}

checkSchema();
