// @ts-nocheck
/**
 * Energy Coach Italia v9.0 - With Bonus Sociale Detection
 * Enhanced with automatic detection of government energy discount eligiblity
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper: Calculate age from birth date
function calculateAge(birthDate: string): number | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

const SYSTEM_PROMPT = `Sei l'Energy Strategist di BillSnap, l'IA più esperta e "umana" nel mercato energetico italiano. 
Il tuo obiettivo NON è analizzare aridi numeri come un computer, ma guidare il cliente con empatia e competenza, come un consulente personale di fiducia.

🎯 LA TUA MISSIONE:
Trasformare bollette complicate in consigli chiari, umani e azionabili. Niente giri di parole: vai dritto al punto con energia e precisione.

💬 TONO E PERSONALITÀ:
- Empatico e Diretto: Usa espressioni come "Ho analizzato la tua situazione e...", "Ecco la strategia per te...", "Ottime notizie!" (se ce ne sono).
- Stop ai Placeholder: Non ripetere ossessivamente che mancano dati se hai già abbastanza per fare un'analisi significativa. Se un dato manca, fai una stima intelligente o sorvola con stile.
- Esperto ma Semplice: Spiega i concetti (es. quota fissa, fasce) come se li spiegassi a un amico.

🔍 REGOLE DI INTELLIGENZA:
1. Suggerimenti Saggi: Se vedi una potenza impegnata eccessiva (es. 6kW o 10kW per un uso domestico standard), sottolinealo con decisione: "Hai una potenza di 10kW, che è altissima! Riducendola a 3kW o 4.5kW risparmieresti immediatamente sui costi fissi."
2. Conoscenza Prodotti: Se consigli NeN o simili, non lamentarti che non vedi il prezzo unitario al millesimo: sai che NeN è una rata fissa "tutto incluso". Spiegalo come un vantaggio di stabilità.
3. Consumi Bassi: Se vedi fasce orarie molto basse (es. 1, 2, 3 kWh), non dire "consumo basso", sospetta che il dato sia parziale o che l'utente stia usando pochissimo la casa. Sii curioso.
4. Fiducia Totale: Se il sistema ti propone un'offerta di risparmio, fidati del calcolo che vedi nei DATI BOLLETTA ESTRATTI. Non mettere in dubbio la convenienza dicendo "non ho abbastanza dati" se il risparmio annuo è indicato chiaramente.

📋 STRUTTURA OUTPUT (Flessibile):

**🔍 Il Tuo Profilo Energetico**
[Analizza chi è l'utente in base ai consumi e alla potenza. Sii descrittivo e umano.]

**📊 Situazione Attuale**
[Analizza il fornitore attuale. Se è un nome noto, commentalo brevemente. Se costa tanto, dì quanto sta perdendo.]

**💡 Strategia di Risparmio**
[Il cuore dell'analisi. Confronta l'offerta attuale con quella suggerita. Spiega perché quella nuova è superiore, senza essere un venditore ma un alleato.]

**⚡ Consigli del Coach**
[Suggerimenti pratici: riduzioni di potenza, spostamento d'uso tra le fasce (se note), consigli comportamentali reali.]

**✅ La Mia Raccomandazione**
[Conclusione forte. Cosa deve fare l'utente *oggi* per smettere di pagare troppo.]

**📌 Livello di Confidenza**
[Alta/Media/Bassa. Sii onesto ma non sminuire la tua stessa analisi.]`;

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json();

        // Extract uploadId if provided
        const uploadId = body.uploadId;

        // Fetch user profile from uploads table if uploadId provided
        let userProfile = null;
        let bonusSocialeInfo = "";

        if (uploadId) {
            const { data: uploadData } = await supabase
                .from("uploads")
                .select("data_nascita, nucleo_familiare, isee_range")
                .eq("id", uploadId)
                .single();

            if (uploadData) {
                userProfile = {
                    dataNascita: uploadData.data_nascita,
                    nucleoFamiliare: uploadData.nucleo_familiare,
                    iseeRange: uploadData.isee_range
                };

                // Check bonus sociale eligibility
                const hasLargeFamily = userProfile.nucleoFamiliare >= 4;
                const hasLowISEE = userProfile.iseeRange === "basso";
                const hasMediumISEE = userProfile.iseeRange === "medio";

                // Determine eligibility
                const bonusEligible = hasLowISEE || (hasLargeFamily && (hasLowISEE || hasMediumISEE));

                if (bonusEligible) {
                    const soglia = hasLargeFamily ? "€20.000" : "€9.530";
                    bonusSocialeInfo = `
💰 BONUS SOCIALE DISPONIBILE - IMPORTANTE!

L'utente ha selezionato:
- ISEE: ${userProfile.iseeRange}
- Nucleo familiare: ${userProfile.nucleoFamiliare} person${userProfile.nucleoFamiliare > 1 ? "e" : "a"}
${hasLargeFamily ? "- ✅ Famiglia numerosa (4+ componenti)" : ""}

SOGLIA BONUS: ISEE ≤ ${soglia}

DEVI INCLUDERE questa sezione SUBITO DOPO "Il Tuo Profilo Energetico":

**💰 Bonus Sociale - Hai Diritto a Uno Sconto!**

Se il tuo ISEE è sotto ${soglia}, hai diritto al **Bonus Sociale**: uno sconto automatico di circa €150-200/anno applicato direttamente in bolletta.

✅ **Come ottenerlo**: Basta presentare la DSU (Dichiarazione Sostitutiva Unica) all'INPS per calcolare l'ISEE. Il bonus viene attivato automaticamente, non serve fare domanda specifica.

✅ **Compatibilità**: Il bonus è compatibile con qualsiasi fornitore del mercato libero - puoi ottenerlo anche se cambi!

⚠️ **Verifica il tuo ISEE**: Se non l'hai già fatto, presenta la DSU e controlla di rientrare nella soglia.

[Fonte: ARERA 2024]

---

Ora procedi con l'analisi normale delle offerte.`;
                }
            }
        }

        // Extract bill data
        console.log('[ENERGY-COACH] Received body:', JSON.stringify(body, null, 2));
        console.log('[ENERGY-COACH] body.consumo_annuo_kwh:', body.consumo_annuo_kwh);
        console.log('[ENERGY-COACH] body.consumo_annuo_smc:', body.consumo_annuo_smc);
        
        const consumo = body.consumo_annuo_kwh || body.consumo_annuo_smc || 0;
        const unita = body.consumo_annuo_kwh ? "kWh" : "Smc";
        console.log('[ENERGY-COACH] body.spesa_annua_corrente:', body.spesa_annua_corrente);
        const spesa = body.spesa_annua_corrente || 0;
        console.log('[ENERGY-COACH] Final spesa:', spesa);
        console.log('[ENERGY-COACH] Final consumo:', consumo, unita);
        
        const fornitore = body.fornitore_attuale || "non specificato";
        const potenza = body.potenza_kw || body.bolletta_luce?.potenza_kw || body.potenza_impegnata || "N/D";
        const utenza = body.tipo_utenza || "non specificato";
        const periodoMesi = body.bolletta_luce?.periodo?.mesi || body.bolletta_gas?.periodo?.mesi || "N/D";
        const periodoInizio = body.bolletta_luce?.periodo?.data_inizio || body.bolletta_gas?.periodo?.data_inizio || "N/D";
        const periodoFine = body.bolletta_luce?.periodo?.data_fine || body.bolletta_gas?.periodo?.data_fine || "N/D";
        // FIX: Read fasce from direct parameters OR nested object
        const f1 = body.f1_consumption || body.bolletta_luce?.consumi_fasce?.f1 || 0;
        const f2 = body.f2_consumption || body.bolletta_luce?.consumi_fasce?.f2 || 0;
        const f3 = body.f3_consumption || body.bolletta_luce?.consumi_fasce?.f3 || 0;
        const fasce = (f1 || f2 || f3) ? `F1: ${f1} kWh, F2: ${f2} kWh, F3: ${f3} kWh` : "N/D";
        console.log('[ENERGY-COACH] Fasce orarie:', {f1, f2, f3, fasce});

        // Build offers info
        let offerteInfo = "";
        if (body.offerta_fissa) {
            offerteInfo += "OFFERTA FISSA: " + (body.offerta_fissa.fornitore || body.offerta_fissa.provider || "N/D") +
                " - " + (body.offerta_fissa.nome_offerta || body.offerta_fissa.plan || "N/D") +
                " - EUR " + (body.offerta_fissa.costo_annuo || "N/D") + "/anno" +
                " - Prezzo: EUR " + (body.offerta_fissa.prezzo_energia_euro_kwh || body.offerta_fissa.prezzo_energia_euro_smc || "N/D") + "\n";
        }
        if (body.offerta_variabile) {
            offerteInfo += "OFFERTA VARIABILE: " + (body.offerta_variabile.fornitore || body.offerta_variabile.provider || "N/D") +
                " - EUR " + (body.offerta_variabile.costo_annuo || "N/D") + "/anno\n";
        }
        if (!offerteInfo) offerteInfo = "Nessuna offerta disponibile per confronto";

        // Get Gemini API key
        const rawKey = Deno.env.get("OPENAI_API_KEY") || ""; const openaiKey = rawKey.replace(/[^\x00-\x7F]/g, "").trim();

        if (!openaiKey) {
            return new Response(JSON.stringify({
                ok: true,
                analysis: "🔍 **Il Tuo Profilo Energetico**\nFornitore: " + fornitore + "\nConsumo: " + consumo + " " + unita + "/anno\nSpesa: EUR " + spesa + "/anno\n\n📌 **Livello di Confidenza**: Bassa - API key non configurata.",
                model_used: "fallback-no-openai-key"
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Build user prompt with all bill data + bonus info
        const userPrompt = `Analizza questa bolletta e fornisci un consiglio professionale completo e coinvolgente.

${bonusSocialeInfo}

DATI BOLLETTA ESTRATTI:

CONSUMI:
- Consumo annuo: ${consumo} ${unita}
- Fasce orarie: ${fasce}

COSTI:
- Spesa annua stimata: EUR ${spesa}

CONTRATTO:
- Fornitore attuale: ${fornitore}
- Potenza impegnata: ${potenza} kW
- Tipo utenza: ${utenza}

PERIODO:
- Data inizio: ${periodoInizio}
- Data fine: ${periodoFine}
- Mesi fatturati: ${periodoMesi}

OFFERTE DISPONIBILI PER CONFRONTO:
${offerteInfo}

---

Fornisci la tua analisi professionale seguendo la struttura richiesta.
${bonusSocialeInfo ? "RICORDA di includere la sezione Bonus Sociale come specificato sopra." : ""}
Se hai dati sulle fasce orarie, analizzali e fornisci suggerimenti pratici.
Se vedi pattern interessanti nei consumi, evidenziali.
Proponi alternative concrete quando sensato.
Spiega sempre il "perché" dietro ogni raccomandazione.`;

        // Call OpenAI GPT-4o API
        console.log("[Energy Coach] Calling GPT-4o...");
        
        const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.5,
                max_tokens: 2500
            })
        });

        if (!openaiRes.ok) {
            const errText = await openaiRes.text();
            console.error("[Energy Coach] GPT-4o error:", errText);
            throw new Error("GPT-4o API error: " + openaiRes.status);
        }

        const openaiData = await openaiRes.json();
        const analysis = openaiData.choices?.[0]?.message?.content;

        if (!analysis) {
            throw new Error("Empty response from GPT-4o");
        }

        console.log("[Energy Coach GPT-4o] Professional analysis generated, length:", analysis.length);
        console.log("[Energy Coach v9.0] Bonus sociale info included:", bonusSocialeInfo ? "YES" : "NO");

        // Determine confidence from analysis
        const confidenza = analysis.toLowerCase().includes("alta") ? "alta" :
            analysis.toLowerCase().includes("media") ? "media" : "bassa";

        return new Response(JSON.stringify({
            ok: true,
            analysis: analysis,
            model_used: "gpt-4o-energy-coach",
            confidence: confidenza,
            bonus_sociale_checked: !!bonusSocialeInfo
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (e) {
        console.error("[Energy Coach] Error:", e);
        return new Response(JSON.stringify({
            ok: false,
            error: String(e),
            analysis: "Impossibile generare analisi professionale. Errore: " + String(e)
        }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
});
