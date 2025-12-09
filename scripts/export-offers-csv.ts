import { createClient } from "@supabase/supabase-js";
import { stringify } from "https://deno.land/std@0.168.0/encoding/csv.ts";

const SUPABASE_URL = "https://jxluygtonamgadqgzgyh.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportCsv() {
    const { data: offers, error } = await supabase
        .from('offers_live')
        .select('*')
        .order('scraped_at', { ascending: false });
    
    if (error) {
        console.error("Error fetching offers:", error);
        return;
    }

    if (!offers || offers.length === 0) {
        console.log("No offers found to export.");
        return;
    }

    // Flatten/Prep for CSV
    const rows = offers.map(o => ({
        Provider: o.fornitore,
        OfferName: o.nome_offerta,
        Type: o.tipo,
        PriceType: o.tipo_prezzo,
        Price_kWh: o.prezzo_energia_euro_kwh, // This should NOW be corrected
        Fixed_Fee_Monthly: o.quota_fissa_mensile_euro,
        Promo: o.sconto_promozione,
        ScrapedAt: o.scraped_at
    }));

    // CSV Header & Content
    const headers = Object.keys(rows[0]);
    const csvContent = [
        headers.join(','), 
        ...rows.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(','))
    ].join('\n');

    console.log(csvContent);
}

exportCsv();
