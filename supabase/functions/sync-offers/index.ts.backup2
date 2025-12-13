// @ts-nocheck
/**
 * Sync Offers Edge Function v6 - Gas Providers Added
 * 
 * Logic:
 * 1. API Check (Placeholder)
 * 2. Firecrawl Scraping (Primary)
 * 3. Vision Fallback (Not implemented fully, but structured)
 * 
 * Features:
 * - Smart Pricing: Adds PUN (0.12) to Spread if price is < 0.05
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(supabaseUrl!, serviceRoleKey!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVIDER_URLS = [
  // LUCE (Electricity) Providers
  { provider: "Pulsee", tipo: "luce", url: "https://www.pulsee.it/offerte/luce-per-te" },
  { provider: "Enel", tipo: "luce", url: "https://www.enel.it/it/luce-e-gas/offerte-luce" },
  { provider: "Eni Plenitude", tipo: "luce", url: "https://www.eni.com/it-IT/luce-gas/offerte.html" },
  { provider: "NeN", tipo: "luce", url: "https://nen.it/luce-gas" },
  { provider: "Iren", tipo: "luce", url: "https://www.irenlucegas.it/casa/offerte-luce" },
  
  // GAS Providers - NEWLY ADDED (Dec 2025)
  { provider: "Pulsee", tipo: "gas", url: "https://www.pulsee.it/offerte/gas-per-te" },
  { provider: "NeN", tipo: "gas", url: "https://nen.it/luce-gas" },
  { provider: "Argos", tipo: "gas", url: "https://www.argos.it/offerte-gas" },
  { provider: "Edison", tipo: "gas", url: "https://www.edison.it/offerte/gas" },
  { provider: "Acea", tipo: "gas", url: "https://www.aceaservizienergetici.it/offerte-gas" },
  { provider: "A2A", tipo: "gas", url: "https://www.a2aenergia.eu/casa/gas" },
  { provider: "Enel", tipo: "gas", url: "https://www.enel.it/it/luce-e-gas/offerte-gas" },
  { provider: "Eni Plenitude", tipo: "gas", url: "https://www.eni.com/it-IT/luce-gas/offerte-gas.html" },
  { provider: "Iren", tipo: "gas", url: "https://www.irenlucegas.it/casa/offerte-gas" },
  { provider: "Sorgenia", tipo: "gas", url: "https://www.sorgenia.it/offerte/gas" },
];

const EXTRACT_PROMPT = `Analizza il contenuto Markdown di questa pagina web di un fornitore di energia.
Identifica le offerte luce/gas (es. prezzo fisso, variabile, a fasce).
Estrai i dati in questo formato JSON array:

[
  {
    "nome_offerta": "Nome commerciale (es. Enel Flex, Pulsee Luce Relax)",
    "fornitore": "Nome fornitore", 
    "tipo": "luce" | "gas",
    "tipo_prezzo": "fisso" | "variabile",
    "prezzo_energia_euro_kwh": number (VEDI REGOLE SOTTO),
    "quota_fissa_mensile_euro": 10.0 (costo commercializzazione, es. 120€/anno = 10€/mese),
    "spread_euro_kwh": 0.02 (se variabile, lo spread sul PUN),
    "indice_mercato": "PUN" (se variabile),
    "promozione_attiva": true/false,
    "sconto_promozione": "Descrizione sconto (es. 50€ bonus)",
    "url_offerta": "Link alla pagina o al pdf (se presente nel testo)"
  }
]

REGOLE CRITICHE PREZZO (IMPORTANTE):
1. OFFERS TYPE: "fisso" (Fixed Price) or "variabile" (Indexed to PUN).
2. PREZZO VARIABILE (Spread):
   - Spesso indicato come "PUN + 0,02 €/kWh".
   - Il "prezzo_energia_euro_kwh" DEVE ESSERE LA SOMMA STIMATA: (PUN attuale ~0.12) + Spread.
   - ESEMPIO: Se spread è 0.02, il prezzo_energia_euro_kwh deve essere 0.14. NON METTERE SOLO LO SPREAD (0.02).
   - Se trovi solo lo spread, aggiungi 0.12.
3. PREZZO FISSO:
   - Usa il prezzo indicato.
4. QUOTA FISSA (CCV):
   - Se indicata annuale (es. 144€/anno), dividi per 12 (12€).
5. FORMATO: Rispondi SOLO con il JSON array.`;

async function scrapeUrl(url: string): Promise<string | null> {
  if (!FIRECRAWL_API_KEY) {
    console.error("[SYNC] FIRECRAWL_API_KEY not configured");
    return null;
  }

  const apiKey = FIRECRAWL_API_KEY.startsWith("fc-") 
    ? FIRECRAWL_API_KEY 
    : `fc-${FIRECRAWL_API_KEY}`;

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        waitFor: 5000, 
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error(`[SYNC] Firecrawl error: ${response.status} - ${JSON.stringify(data)}`);
      return null;
    }

    return data?.data?.markdown || null;
  } catch (error) {
    console.error(`[SYNC] Scrape error for ${url}:`, error);
    return null;
  }
}

async function parseOffersWithGPT(content: string, provider: string, tipo: string): Promise<any[]> {
  if (!OPENAI_API_KEY || !content) return [];

  const truncatedContent = content.substring(0, 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Sei un analista dati energia. Estrai dati strutturati da landing page." },
          { role: "user", content: `Provider: ${provider}\nTipo: ${tipo}\n\nCONTENT:\n${truncatedContent}\n\n${EXTRACT_PROMPT}` }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("[SYNC] OpenAI error:", txt);
      return [];
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("[SYNC] JSON parse error:", e);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error("[SYNC] GPT parse error:", error);
    return [];
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { single_url } = await req.json().catch(() => ({}));
    
    let urlsToScrape = PROVIDER_URLS;
    if (single_url) {
      urlsToScrape = [{ provider: "Custom", tipo: "luce", url: single_url }];
    }

    console.log(`[SYNC] Processing ${urlsToScrape.length} URLs`);

    const allOffers: any[] = [];
    const errors: string[] = [];

    for (const source of urlsToScrape) {
      console.log(`[SYNC] Scraping ${source.provider}...`);
      
      // 1. API CHECK (Placeholder - could implement real API logic here)
      // if (hasApi(source.provider)) ...
      
      // 2. FIRECRAWL SCRAPING
      let markdown = await scrapeUrl(source.url);
      
      // 3. VISION FALLBACK (Placeholder logic as requested)
      if (!markdown || markdown.length < 500) {
          console.warn(`[SYNC] Firecrawl returned empty for ${source.provider}. Vision fallback logic triggered (NOT IMPLEMENTED).`);
          // Logic: captureScreenshot(source.url) -> sendToGeminiVision()
          // Currently just logging.
      }

      if (!markdown) {
        errors.push(`Failed: ${source.provider}`);
        continue;
      }

      const offers = await parseOffersWithGPT(markdown, source.provider, source.tipo);
      console.log(`[SYNC] Found ${offers.length} offers for ${source.provider}`);

      for (const offer of offers) {
        // --- POST-PROCESSING LOGIC (The "No Sense" Fix) ---
        // Verify price makes sense. If variable < 0.05, it implies Spread only.
        let finalPrice = offer.prezzo_energia_euro_kwh;
        if (offer.tipo_prezzo === "variabile" && finalPrice !== null && finalPrice < 0.05) {
             console.log(`[SYNC] Correction: Price ${finalPrice} looks like Spread. Adding PUN (0.12).`);
             finalPrice = Number((finalPrice + 0.12).toFixed(4));
        }

        allOffers.push({
          fornitore: offer.fornitore || source.provider,
          nome_offerta: offer.nome_offerta || "Offerta",
          tipo: offer.tipo || source.tipo,
          tipo_prezzo: offer.tipo_prezzo || "fisso",
          prezzo_energia_euro_kwh: finalPrice, 
          prezzo_energia_euro_smc: offer.prezzo_energia_euro_smc || null,
          quota_fissa_mensile_euro: offer.quota_fissa_mensile_euro || null,
          promozione_attiva: Boolean(offer.promozione_attiva),
          sconto_promozione: offer.sconto_promozione ? String(offer.sconto_promozione) : null,
          url_offerta: offer.url_offerta || source.url,
          fonte: source.url
        });
      }
    }

    console.log(`[SYNC] Total offers found: ${allOffers.length}`);

    let savedCount = 0;
    if (allOffers.length > 0) {
      const providers = [...new Set(allOffers.map(o => o.fornitore))];
      
      for (const prov of providers) {
        await supabase.from("offers_live").delete().eq("fornitore", prov);
      }

      const { error: insertError, data: insertData } = await supabase
        .from("offers_live")
        .insert(allOffers)
        .select();
        
      if (insertError) {
        console.error("[SYNC] DB error:", insertError.message);
        errors.push(`DB: ${insertError.message}`);
      } else {
        savedCount = insertData?.length || 0;
        console.log(`[SYNC] Saved ${savedCount} offers`);
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        offers_found: allOffers.length,
        offers_saved: savedCount,
        errors: errors.length > 0 ? errors : undefined,
        sample: allOffers.slice(0, 3),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[SYNC] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
