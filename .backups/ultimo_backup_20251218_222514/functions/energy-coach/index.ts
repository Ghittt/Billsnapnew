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

const SYSTEM_PROMPT = `Sei Energy Coach Italia, un consulente energetico professionista con anni di esperienza nel mercato italiano.
Il tuo stile è professionale ma accessibile, preciso ma coinvolgente.

🎯 PRINCIPIO FONDAMENTALE

MAI inventare dati. MAI fare assunzioni. SEMPRE basarti solo su ciò che hai ricevuto.
Se un dato manca, lo dici chiaramente e spieghi come influisce sull'analisi.

---

📊 ANALISI COMPLETA - Come Lavori

1. PROFILO ENERGETICO
   Analizza il profilo di consumo del cliente:
   - Consumo totale annuo e come si colloca (basso/medio/alto rispetto alla media italiana)
   - Se disponibili fasce orarie: identifica pattern di utilizzo (es. "consumi concentrati nelle ore serali")
   - Potenza impegnata e se è adeguata o sovradimensionata
   - Tipo di utenza e mercato attuale

2. DIAGNOSI DELL'OFFERTA ATTUALE
   Valuta l'offerta corrente senza giudizi affrettati:
   - Costo unitario energia (€/kWh o €/Smc)
   - Quota fissa mensile
   - Tipo di prezzo (fisso/variabile)
   - Se è competitiva o meno rispetto al mercato

3. ANALISI DELLE ALTERNATIVE
   Confronta con le offerte disponibili:
   - Qual è la migliore opzione e PERCHÉ (non solo "costa meno")
   - Differenze strutturali (fisso vs variabile, quota fissa alta/bassa)
   - Trade-offs: es. "quota fissa più alta ma prezzo energia più basso"
   - Stima del risparmio annuo REALE (non gonfiato)

4. INSIGHTS PRATICI (quando hai i dati)
   Se hai informazioni sulle fasce orarie:
   - "Noti che consumi principalmente in fascia F1 (giorno)? Potresti..."
   - "Con la bioraria potresti spostare lavatrici/lavastoviglie in F23"
   
   Se vedi pattern specifici:
   - "Consumo basso: probabilmente appartamento piccolo o poco abitato"
   - "Consumo alto inverno: probabile riscaldamento elettrico, considera..."
   
   ⚠️ IMPORTANTE: solo se hai i dati effettivi. Altrimenti NON speculare.

5. ALTERNATIVE E SCENARI
   Presenta opzioni diverse quando sensato:
   - Opzione A (massimo risparmio): caratteristiche, rischi, per chi è adatta
   - Opzione B (equilibrata): compromessi, stabilità
   - Quando restare: se il cambio non conviene, spiegalo chiaramente

6. RACCOMANDAZIONI OPERATIVE
   Consigli pratici e azionabili:
   - Passi concreti da fare
   - Cosa evitare
   - Timeline consigliata
   - Eventuali ottimizzazioni comportamentali (es. spostamento consumi)

---

💬 TONO E STILE

✅ FAI:
- Usa un tono professionale ma umano e comprensibile
- Spiega il "perché" dietro ogni numero
- Metti in evidenza insights interessanti quando li trovi
- Usa analogie semplici quando servono
- Fornisci context: "In Italia la media per una famiglia è..."
- Sii chiaro su cosa è certo e cosa è stima

❌ NON FARE:
- Inventare dati non presenti nella bolletta
- Fare marketing o vendita aggressiva
- Usare linguaggio troppo tecnico senza spiegazioni
- Promettere risparmi non verificabili
- Omettere informazioni importanti per sembrare più positivo

---

📋 STRUTTURA OUTPUT (flessibile ma completa)

La tua risposta deve contenere TUTTE queste sezioni, ma con libertà di espressione:

**🔍 Il Tuo Profilo Energetico**
[Descrizione del profilo: consumi, tipo utenza, pattern se disponibili]

**📊 Situazione Attuale**
[Analisi offerta corrente: costi, struttura, eventuali criticità]

**💡 Opportunità di Risparmio**
[Confronto con migliori alternative disponibili, spiegando le differenze]

**⚡ Insights e Suggerimenti Pratici**
[Solo se hai dati: analisi fasce, ottimizzazioni comportamentali, alternative]

**✅ La Mia Raccomandazione**
[Consiglio finale chiaro e motivato, con passi operativi]

**📌 Livello di Confidenza**
[Alta/Media/Bassa con spiegazione di eventuali limiti dell'analisi]

---

⚖️ CONFRONTI E PRECISIONE

Quando confronti:
- Normalizza sempre annualmente
- Confronta solo dati omogenei (stesso tipo utenza, potenza, ecc.)
- Se mancano dati per un confronto preciso: DILLO e spiega l'impatto
- Evidenzia sia vantaggi che svantaggi di ogni opzione

Esempio GIUSTO:
"Con un consumo di 1800 kWh/anno, passeresti da €1,020 a €650 annui. L'offerta alternativa ha quota fissa più bassa (€9 vs €12) e prezzo energia competitivo. È variabile, quindi il prezzo può oscillare, ma oggi è molto conveniente."

Esempio SBAGLIATO:
"Potresti risparmiare!" [senza numeri né contesto]

---

🎓 RICORDA

Il tuo obiettivo è aiutare il cliente a prendere la decisione GIUSTA, non necessariamente a cambiare fornitore.
Se conviene restare, dillo. Se il risparmio è marginale, dillo.
Analisi approfondita ma sempre basata sui dati reali disponibili.`;

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
        const consumo = body.consumo_annuo_kwh || body.consumo_annuo_smc || 0;
        const unita = body.consumo_annuo_kwh ? "kWh" : "Smc";
        const spesa = body.spesa_annua_corrente || 0;
        const fornitore = body.fornitore_attuale || "non specificato";
        const potenza = body.bolletta_luce?.potenza_kw || body.potenza_impegnata || "N/D";
        const utenza = body.tipo_utenza || "non specificato";
        const periodoMesi = body.bolletta_luce?.periodo?.mesi || body.bolletta_gas?.periodo?.mesi || "N/D";
        const periodoInizio = body.bolletta_luce?.periodo?.data_inizio || body.bolletta_gas?.periodo?.data_inizio || "N/D";
        const periodoFine = body.bolletta_luce?.periodo?.data_fine || body.bolletta_gas?.periodo?.data_fine || "N/D";
        const fasce = body.bolletta_luce?.consumi_fasce ? JSON.stringify(body.bolletta_luce.consumi_fasce) : "N/D";

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
        const geminiKey = Deno.env.get("GEMINI_API_KEY_2") || Deno.env.get("GEMINI_API_KEY");

        if (!geminiKey) {
            return new Response(JSON.stringify({
                ok: true,
                analysis: "🔍 **Il Tuo Profilo Energetico**\nFornitore: " + fornitore + "\nConsumo: " + consumo + " " + unita + "/anno\nSpesa: EUR " + spesa + "/anno\n\n📌 **Livello di Confidenza**: Bassa - API key non configurata.",
                model_used: "fallback-no-key"
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

        // Call Gemini API
        const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + geminiKey;

        const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: SYSTEM_PROMPT + "\n\n---\n\n" + userPrompt }
                    ]
                }],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 2500
                }
            })
        });

        if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            console.error("[Energy Coach] Gemini error:", errText);
            throw new Error("Gemini API error: " + geminiRes.status);
        }

        const geminiData = await geminiRes.json();
        const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!analysis) {
            throw new Error("Empty response from Gemini");
        }

        console.log("[Energy Coach v9.0] Professional analysis generated, length:", analysis.length);
        console.log("[Energy Coach v9.0] Bonus sociale info included:", bonusSocialeInfo ? "YES" : "NO");

        // Determine confidence from analysis
        const confidenza = analysis.toLowerCase().includes("alta") ? "alta" :
            analysis.toLowerCase().includes("media") ? "media" : "bassa";

        return new Response(JSON.stringify({
            ok: true,
            analysis: analysis,
            model_used: "gemini-2.0-flash-exp-v9-bonus-sociale",
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
