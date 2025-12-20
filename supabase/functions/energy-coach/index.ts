// @ts-nocheck
/**
 * Energy Coach Italia v15.0 - Fetch OCR from DB for Correct Commodity
 * - LUCE and GAS are never mixed
 * - Fetches OCR data from DB to determine commodity correctly
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT_LUCE = `Sei il consulente energetico di BillSnap. Stai analizzando una BOLLETTA DELLA LUCE (elettricità).

⚠️ REGOLA FONDAMENTALE: Parla SOLO di luce/elettricità. NON menzionare MAI il gas.

📝 STRUTTURA:

**🔍 La Tua Situazione**
2-3 frasi: fornitore attuale, spesa annua elettrica, consumi in kWh.

**💡 Le Tue Opzioni**
Presenta le offerte disponibili:
📦 **Offerta a Prezzo Fisso**: prezzo bloccato 12-24 mesi
📊 **Offerta a Prezzo Variabile**: segue il mercato

**⚡ Sulla Potenza**
- 1-2 persone: 3kW
- 3-4 persone: 4.5-6kW
- Villa/5+ persone: 10kW

**✅ Cosa Fare Ora**
"Scegli l'offerta e clicca per attivarla!"

📌 TONO: Amichevole, professionale. MAI parlare di gas.`;

const SYSTEM_PROMPT_GAS = `Sei il consulente energetico di BillSnap. Stai analizzando una BOLLETTA DEL GAS.

⚠️ REGOLA FONDAMENTALE: Parla SOLO di gas metano. NON menzionare MAI la luce/elettricità.

📝 STRUTTURA:

**🔍 La Tua Situazione**
2-3 frasi: fornitore attuale, spesa annua gas, consumi in Smc.

**💡 Le Tue Opzioni**
Presenta le offerte disponibili:
📦 **Offerta a Prezzo Fisso**: prezzo bloccato 12-24 mesi
📊 **Offerta a Prezzo Variabile**: segue il mercato

**🔥 Sul Consumo Gas**
- Solo cottura: 100-200 Smc/anno
- Cottura + acqua calda: 500-800 Smc/anno
- Con riscaldamento: 1000-1500 Smc/anno

**✅ Cosa Fare Ora**
"Scegli l'offerta e clicca per attivarla!"

📌 TONO: Amichevole, professionale. MAI parlare di luce.`;

serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json();
        const { 
            uploadId, 
            spesa_annua_corrente, 
            fornitore_attuale, 
            f1_consumption, 
            f2_consumption, 
            f3_consumption, 
            potenza_kw, 
            offerta_fissa, 
            offerta_variabile,
            billType,
            consumo_annuo_kwh,
            consumo_annuo_smc
        } = body;

        // CRITICAL: Fetch OCR data from DB to determine commodity correctly
        let ocrGasSmc = consumo_annuo_smc || 0;
        let ocrKwh = consumo_annuo_kwh || 0;
        
        if (uploadId) {
            console.log("[ENERGY-COACH] Fetching OCR data for uploadId:", uploadId);
            const { data: ocrData } = await supabase
                .from("ocr_results")
                .select("gas_smc, consumo_annuo_smc, annual_kwh, raw_json")
                .eq("upload_id", uploadId)
                .single();
            
            if (ocrData) {
                // Prioritize DB data over frontend params
                ocrGasSmc = ocrData.gas_smc ?? ocrData.consumo_annuo_smc ?? ocrData.raw_json?.bolletta_gas?.consumo_annuo_smc ?? 0;
                ocrKwh = ocrData.annual_kwh ?? ocrData.raw_json?.bolletta_luce?.consumo_annuo_kwh ?? 0;
                console.log("[ENERGY-COACH] OCR data from DB: gas_smc=", ocrGasSmc, "kwh=", ocrKwh);
            }
        }

        // Determine commodity from DB data (most reliable)
        let commodity = (billType || "").toLowerCase();
        if (!commodity || commodity === "combo" || commodity === "luce") {
            // Override with DB data
            if (ocrGasSmc > 0 && ocrKwh === 0) {
                commodity = "gas";
            } else if (ocrKwh > 0) {
                commodity = "luce";
            } else if (ocrGasSmc > 0) {
                commodity = "gas";
            }
        }
        
        console.log("[ENERGY-COACH] Final commodity:", commodity, "(gas_smc:", ocrGasSmc, ", kwh:", ocrKwh, ")");

        let nucleoFamiliare = null;
        let tipoUtenza = "domestico";
        let bonusInfo = "";
        
        if (uploadId) {
            const { data: uploadData } = await supabase.from("uploads").select("nucleo_familiare, isee_range, tipo_utenza").eq("id", uploadId).single();
            if (uploadData) {
                nucleoFamiliare = uploadData.nucleo_familiare;
                tipoUtenza = uploadData.tipo_utenza || "domestico";
                if (uploadData.isee_range === "basso") {
                    bonusInfo = `\n\n💰 **Bonus Sociale**: Potresti avere diritto al Bonus ARERA (~€150-200/anno).`;
                }
            }
        }

        // Use correct consumption and unit based on commodity
        const consumo = commodity === "gas" ? ocrGasSmc : ocrKwh;
        const unitaConsumo = commodity === "gas" ? "Smc" : "kWh";

        let offerteInfo = "";
        if (offerta_fissa) {
            const risparmio = spesa_annua_corrente - (offerta_fissa.costo_annuo || 0);
            offerteInfo += `OFFERTA FISSA: ${offerta_fissa.nome_offerta} (${offerta_fissa.provider}) - €${offerta_fissa.costo_annuo}/anno (risparmio: €${risparmio > 0 ? risparmio.toFixed(0) : 0}/anno)\n`;
        }
        if (offerta_variabile) {
            const risparmio = spesa_annua_corrente - (offerta_variabile.costo_annuo || 0);
            offerteInfo += `OFFERTA VARIABILE: ${offerta_variabile.nome_offerta} (${offerta_variabile.provider}) - €${offerta_variabile.costo_annuo}/anno (risparmio: €${risparmio > 0 ? risparmio.toFixed(0) : 0}/anno)\n`;
        }
        if (!offerteInfo) offerteInfo = "Nessuna offerta disponibile";

        // Build user prompt with commodity-specific data
        let userPrompt = "";
        if (commodity === "gas") {
            userPrompt = `
BOLLETTA GAS - DATI UTENTE:
- Fornitore attuale: ${fornitore_attuale || 'Non specificato'}
- Spesa annua gas: €${spesa_annua_corrente || 0}
- Consumo gas: ${consumo} Smc/anno
- Nucleo familiare: ${nucleoFamiliare || 'Non specificato'} persone
- Tipo utenza: ${tipoUtenza}

OFFERTE GAS:
${offerteInfo}
${bonusInfo}

Presenta ENTRAMBE le offerte GAS. Parla SOLO di gas, MAI di luce.`;
        } else {
            userPrompt = `
BOLLETTA LUCE - DATI UTENTE:
- Fornitore attuale: ${fornitore_attuale || 'Non specificato'}
- Spesa annua luce: €${spesa_annua_corrente || 0}
- Consumo elettrico: ${consumo} kWh/anno
- Potenza: ${potenza_kw || 'N/D'} kW
- Nucleo familiare: ${nucleoFamiliare || 'Non specificato'} persone
- Tipo utenza: ${tipoUtenza}
- Fasce orarie: F1=${f1_consumption || 0}, F2=${f2_consumption || 0}, F3=${f3_consumption || 0}

OFFERTE LUCE:
${offerteInfo}
${bonusInfo}

Presenta ENTRAMBE le offerte LUCE. Se suggerisci cambio potenza, spiega chi se ne occupa. Parla SOLO di luce, MAI di gas.`;
        }

        // Select appropriate system prompt
        const SYSTEM_PROMPT = commodity === "gas" ? SYSTEM_PROMPT_GAS : SYSTEM_PROMPT_LUCE;

        const rawKey = Deno.env.get("OPENAI_API_KEY") || "";
        const openaiKey = rawKey.replace(/[^\x00-\x7F]/g, "").trim();
        if (!openaiKey) throw new Error("OPENAI_API_KEY missing");

        console.log("[ENERGY-COACH] Calling OpenAI for", commodity.toUpperCase());

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.6,
                max_tokens: 1500
            })
        });

        if (!response.ok) throw new Error(`OpenAI Error: ${response.status}`);
        const data = await response.json();
        const analysis = data.choices?.[0]?.message?.content;

        return new Response(JSON.stringify({
            ok: true,
            analysis,
            model_used: "gpt-4o-v15",
            commodity: commodity,
            confidence: "Alta"
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (err) {
        console.error("[Energy Coach v15] Error:", err);
        return new Response(JSON.stringify({ ok: false, error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
