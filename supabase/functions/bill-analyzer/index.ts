// @ts-nocheck
/**
 * Bill Analyzer Edge Function v6 - Period-Based Calculation
 * 
 * KEY LOGIC:
 * 1. Period-based cost calculation: costo_mensile = totale_periodo_euro / mesi
 *    - "Ottobre" (mesi=1): €27 / 1 = €27/mese
 *    - "Ottobre-Novembre" (mesi=2): €54 / 2 = €27/mese
 * 
 * 2. Commodity filtering: Gas bills → only gas offers, Luce bills → only luce offers
 * 
 * 3. Consumption-based evaluation: Offers evaluated on actual consumption (Smc for gas, kWh for luce)
 * 
 * 4. Positive savings only: NEVER recommend offers more expensive than current
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function estimateMesi(dataInizio, dataFine) {
  if (!dataInizio || !dataFine) return null;
  try {
    const diffDays = Math.ceil(Math.abs(new Date(dataFine) - new Date(dataInizio)) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.round(diffDays / 30));
  } catch { return null; }
}

function calcConsumoAnnuo(consumoPeriodo, mesi) {
  if (!consumoPeriodo || !mesi || mesi <= 0) return null;
  return Math.round(consumoPeriodo * (12 / mesi));
}

function calcCostoAnnuo(consumo, prezzo, quotaFissa) {
  if (prezzo === null || prezzo === undefined) return null;
  return Math.round((consumo * prezzo + (quotaFissa || 0) * 12) * 100) / 100;
}

function selectBestOffers(offerte, consumo, costoAttuale, soglia, tipo) {
  const pk = tipo === "luce" ? "prezzo_energia_euro_kwh" : "prezzo_energia_euro_smc";
  
  // CRITICAL: Filter by commodity type to prevent gas/luce mix-ups
  const offerteFiltered = offerte.filter(o => {
    if (tipo === "luce") {
      return o.commodity === "luce" || o.commodity === "electricity" || o.tipo_fornitura === "luce";
    } else if (tipo === "gas") {
      return o.commodity === "gas" || o.tipo_fornitura === "gas";
    }
    return true; // fallback if commodity not specified
  });
  
  const valutate = offerteFiltered
    .filter(o => o[pk] != null)
    .map(o => {
      const costo = calcCostoAnnuo(consumo, o[pk], o.quota_fissa_mensile_euro);
      const risparmio = costo !== null ? costoAttuale - costo : null;
      const isFisso = o.tipo_prezzo === "fisso" || o.is_fixed_price || 
                      (o.nome_offerta?.toLowerCase().includes("fix") || o.nome_offerta?.toLowerCase().includes("fisso"));
      return { o, costo, risparmio, isFisso };
    })
    // CRITICAL RULE: ONLY recommend offers with POSITIVE savings (cheaper than current)
    .filter(x => x.risparmio !== null && x.risparmio > 0)
    // SORT BY LOWEST COST (most economical offer first)
    .sort((a, b) => (a.costo || Infinity) - (b.costo || Infinity));

  console.log(`[selectBestOffers] ${tipo.toUpperCase()}: Found ${valutate.length} better offers (from ${offerteFiltered.length} ${tipo} offers, ${offerte.length} total in DB)`);
  
  if (valutate.length === 0 && offerteFiltered.length > 0) {
    console.log(`[selectBestOffers] ${tipo.toUpperCase()}: All ${offerteFiltered.length} offers are MORE EXPENSIVE than current (€${costoAttuale}/year)`);
  }
  
  if (valutate.length > 0) {
    console.log(`[selectBestOffers] ${tipo.toUpperCase()}: CHEAPEST = ${valutate[0].o.fornitore} ${valutate[0].o.nome_offerta} (€${valutate[0].costo}/year, saves €${valutate[0].risparmio}/year)`);
  }

  // CRITICAL: Return CHEAPEST offer overall as primary recommendation
  return {
    fissa: valutate[0] || null,  // CHEAPEST offer (regardless of type)
    variabile: valutate[1] || null  // Second cheapest (if exists)
  };
}

function formatOffer(x) {
  if (!x) return { id: null, nome: null, fornitore: null, costo_mensile: null, risparmio_mensile: null };
  const risparmioMensile = x.risparmio ? Math.round(x.risparmio / 12 * 100) / 100 : null;
  return {
    id: x.o.id,
    nome: x.o.nome_offerta,
    fornitore: x.o.fornitore,
    costo_mensile: x.costo ? Math.round(x.costo / 12 * 100) / 100 : null,
    risparmio_mensile: risparmioMensile
  };
}

function genSpiegazione(offertaFissa, offertaVariabile) {
  if (!offertaFissa && !offertaVariabile) {
    return "Non abbiamo trovato offerte migliori per il tuo profilo.";
  }
  if (offertaFissa && offertaVariabile) {
    const diffMensile = (offertaVariabile.risparmio_mensile || 0) - (offertaFissa.risparmio_mensile || 0);
    if (Math.abs(diffMensile) < 3) {
      return `Le due offerte sono molto simili. L'offerta fissa ti protegge dagli aumenti per 12-24 mesi. Quella variabile segue il mercato: può costare meno se i prezzi scendono, ma potrebbe aumentare nei prossimi mesi. Per la maggior parte delle famiglie, consigliamo il fisso per la tranquillità.`;
    } else if (diffMensile > 0) {
      return `L'offerta variabile oggi costa circa €${Math.abs(diffMensile).toFixed(0)} in meno al mese, ma il prezzo può cambiare. L'offerta fissa ti garantisce stabilità: sai già quanto pagherai per i prossimi 12-24 mesi. Se preferisci evitare sorprese, scegli il fisso.`;
    } else {
      return `L'offerta fissa oggi è più conveniente di circa €${Math.abs(diffMensile).toFixed(0)} al mese. In più ti protegge da eventuali rincari futuri. L'offerta variabile potrebbe diventare più conveniente se i prezzi dell'energia scendono, ma comporta più rischio.`;
    }
  }
  if (offertaFissa) return `Abbiamo trovato un'offerta a prezzo fisso che ti farebbe risparmiare circa €${offertaFissa.risparmio_mensile?.toFixed(0) || '?'} al mese. Il prezzo resta bloccato per 12-24 mesi.`;
  if (offertaVariabile) return `Abbiamo trovato un'offerta variabile che oggi ti farebbe risparmiare circa €${offertaVariabile.risparmio_mensile?.toFixed(0) || '?'} al mese. Attenzione: il prezzo può variare.`;
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "content-type": "application/json" } });

    const { ocr, profilo_utente, offerte_luce, offerte_gas, parametri_business } = await req.json();
    if (!ocr || !profilo_utente || !parametri_business) return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "content-type": "application/json" } });

    const soglia = parametri_business.soglia_risparmio_significativo_mese || 5;
    const isOver70 = profilo_utente.eta >= 70;
    const isIseeBasso = profilo_utente.isee_range === "basso";

    // ====== LUCE ======
    let luce = { analisi_disponibile: false, costo_attuale_mensile: null, costo_attuale_annuo: null, consumo_annuo: null, offerta_fissa: formatOffer(null), offerta_variabile: formatOffer(null), stato: "dati_insufficienti", messaggio_utente: "Carica una bolletta luce per ricevere un'analisi." };

    if (ocr.tipo_fornitura === "luce" || ocr.tipo_fornitura === "luce+gas") {
      const b = ocr.bolletta_luce;
      if (b?.totale_periodo_euro != null) {
        const mesi = b.periodo?.mesi || estimateMesi(b.periodo?.data_inizio, b.periodo?.data_fine);
        if (mesi > 0) {
          const costoMensile = Math.round(b.totale_periodo_euro / mesi * 100) / 100;
          const costoAnnuo = Math.round(costoMensile * 12 * 100) / 100;
          const consumo = b.consumo_annuo_kwh || calcConsumoAnnuo(b.consumo_periodo_kwh, mesi);

          if (consumo > 0) {
            luce.analisi_disponibile = true;
            luce.costo_attuale_mensile = costoMensile;
            luce.costo_attuale_annuo = costoAnnuo;
            luce.consumo_annuo = consumo;

            const { fissa, variabile } = selectBestOffers(offerte_luce || [], consumo, costoAnnuo, soglia, "luce");
            const offertaFissa = formatOffer(fissa);
            const offertaVariabile = formatOffer(variabile);
            luce.offerta_fissa = offertaFissa;
            luce.offerta_variabile = offertaVariabile;

            if (offertaFissa.id || offertaVariabile.id) {
              luce.stato = "puoi_risparmiare";
              const best = offertaFissa.id ? offertaFissa : offertaVariabile;
              luce.messaggio_utente = `Potresti risparmiare circa €${best.risparmio_mensile?.toFixed(0) || '?'} al mese passando a ${best.nome || 'una nuova offerta'}.`;
            } else {
              luce.stato = "sei_gia_messo_bene";
              luce.messaggio_utente = "Ottima notizia! La tua tariffa luce attuale è già tra le migliori sul mercato. Non ha senso cambiare fornitore.";
            }
          } else { luce.messaggio_utente = "Non siamo riusciti a determinare il tuo consumo annuo."; }
        } else { luce.messaggio_utente = "Non siamo riusciti a determinare il periodo di fatturazione."; }
      }
    }

    // ====== GAS ======
    let gas = { analisi_disponibile: false, costo_attuale_mensile: null, costo_attuale_annuo: null, consumo_annuo: null, offerta_fissa: formatOffer(null), offerta_variabile: formatOffer(null), stato: "dati_insufficienti", messaggio_utente: "Carica una bolletta gas per ricevere un'analisi." };

    if (ocr.tipo_fornitura === "gas" || ocr.tipo_fornitura === "luce+gas") {
      const b = ocr.bolletta_gas;
      if (b?.totale_periodo_euro != null) {
        const mesi = b.periodo?.mesi || estimateMesi(b.periodo?.data_inizio, b.periodo?.data_fine);
        if (mesi > 0) {
          const costoMensile = Math.round(b.totale_periodo_euro / mesi * 100) / 100;
          const costoAnnuo = Math.round(costoMensile * 12 * 100) / 100;
          const consumo = b.consumo_annuo_smc || calcConsumoAnnuo(b.consumo_periodo_smc, mesi);

          if (consumo > 0) {
            gas.analisi_disponibile = true;
            gas.costo_attuale_mensile = costoMensile;
            gas.costo_attuale_annuo = costoAnnuo;
            gas.consumo_annuo = consumo;

            const { fissa, variabile } = selectBestOffers(offerte_gas || [], consumo, costoAnnuo, soglia, "gas");
            const offertaFissa = formatOffer(fissa);
            const offertaVariabile = formatOffer(variabile);
            gas.offerta_fissa = offertaFissa;
            gas.offerta_variabile = offertaVariabile;

            if (offertaFissa.id || offertaVariabile.id) {
              gas.stato = "puoi_risparmiare";
              const best = offertaFissa.id ? offertaFissa : offertaVariabile;
              gas.messaggio_utente = `Potresti risparmiare circa €${best.risparmio_mensile?.toFixed(0) || '?'} al mese passando a ${best.nome || 'una nuova offerta'}.`;
            } else {
              gas.stato = "sei_gia_messo_bene";
              gas.messaggio_utente = "Ottima notizia! La tua tariffa gas attuale è già tra le migliori sul mercato. Non ha senso cambiare fornitore.";
            }
          }
        }
      }
    }

    // ====== AGEVOLAZIONI ======
    const agevolazioni = [];
    if (isOver70) agevolazioni.push({ tipo: "over70", titolo: "Possibili agevolazioni Over 70", descrizione: "Potresti rientrare nelle categorie di clienti vulnerabili con tutele rafforzate. Verifica con il tuo fornitore o con un CAF." });
    if (isIseeBasso) agevolazioni.push({ tipo: "isee_basso", titolo: "Bonus Sociale Energia", descrizione: "Potresti avere diritto al bonus sociale se il tuo ISEE è inferiore alla soglia nazionale. Presenta la DSU al CAF per verificare." });

    // ====== SPIEGAZIONE ======
    const spiegazione = genSpiegazione(luce.offerta_fissa.id ? luce.offerta_fissa : null, luce.offerta_variabile.id ? luce.offerta_variabile : null) || genSpiegazione(gas.offerta_fissa.id ? gas.offerta_fissa : null, gas.offerta_variabile.id ? gas.offerta_variabile : null);

    return new Response(JSON.stringify({ luce, gas, agevolazioni_potenziali: agevolazioni, spiegazione_fisso_vs_variabile: spiegazione }), { headers: { ...corsHeaders, "content-type": "application/json" } });

  } catch (error) {
    console.error("[BILL-ANALYZER] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "content-type": "application/json" } });
  }
});
