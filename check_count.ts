import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("VITE_SUPABASE_URL") || process.env.VITE_SUPABASE_URL;
const key = Deno.env.get("VITE_SUPABASE_ANON_KEY") || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.log("No env vars found, checking .env");
}

console.log("Checking DB...");
// Mocking the check for now or I need to source .env
