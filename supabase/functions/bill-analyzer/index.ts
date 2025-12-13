// @ts-nocheck
/**
 * BillSnap Core Engine v1.0
 * 
 * A stable, correct, and coherent bill analysis engine.
 * RULES:
 * 1. Never confuse GAS and LUCE
 * 2. Never recommend more expensive offers
 * 3. Always validate savings calculations
 * 4. Return structured JSON with embedded expert_copy
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ==================== HELPER FUNCTIONS ====================

function determineCommodity(bill) {
  const hasPDR = bill.identifiers?.PDR || false;
  const hasPOD = bill.identifiers?.POD || false;
  const hasSmc = (bill.consumption?.smc || 0) > 0;
  const hasKwh = (bill.consumption?.kwh || 0) > 0;
  
  const isGas = hasPDR || hasSmc;
  const isLuce = hasPOD || hasKwh;
  
  if (isGas && isLuce) return "DUAL";
  if (isGas) return "GAS";
  if (isLuce) return "LUCE";
  
  // Fallback to hint
  if (bill.commodity_hint) return bill.commodity_hint;
  
  return "ASK_CLARIFICATION";
}

function calculateMonthsEquivalent(period) {
  if (period?.start && period?.end) {
    const start = new Date(period.start);
    const end = new Date(period.end);
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diffDays / 30.4375);
  }
  
  // Use label if available
  const labelMap = { "mensile": 1, "bimestrale": 2, "trimestrale": 3, "semestrale": 6, "annuale": 12 };
  if (period?.label && labelMap[period.label.toLowerCase()]) {
    return labelMap[period.label.toLowerCase()];
  }
  
  // Default prudent estimate
  return 1;
}

function filterOffersByCommodity(offers, commodity) {
  if (!offers || !Array.isArray(offers)) return [];
  
  return offers.filter(o => {
    const offerCommodity = (o.commodity || "").toUpperCase();
    if (commodity === "GAS") {
      return offerCommodity === "GAS";
    } else if (commodity === "LUCE") {
      return offerCommodity === "LUCE" || offerCommodity === "ELECTRICITY";
    }
    return false;
  }).map(o => {
    // Ensure annual_eur exists
    if (!o.estimated_annual_eur && o.estimated_monthly_eur) {
      o.estimated_annual_eur = o.estimated_monthly_eur * 12;
    }
    return o;
  }).filter(o => o.estimated_annual_eur && o.estimated_annual_eur > 0);
}

function selectBestOffer(offers, currentAnnual, tolerance = 0.02) {
  if (!offers || offers.length === 0) {
    return { offer: null, action: "INSUFFICIENT_DATA", reason: "Nessuna offerta comparabile disponibile." };
  }
  
  // Sort by annual cost (cheapest first)
  const sorted = [...offers].sort((a, b) => a.estimated_annual_eur - b.estimated_annual_eur);
  const best = sorted[0];
  
  // Check if best offer is actually cheaper
  if (!currentAnnual || currentAnnual <= 0) {
    return { offer: best, action: "INSUFFICIENT_DATA", reason: "Costo attuale non disponibile per il confronto." };
  }
  
  const savingsPercent = (currentAnnual - best.estimated_annual_eur) / currentAnnual;
  
  // CRITICAL RULE: If savings ≤ 0 or < 2%, action = STAY with explanation
  if (savingsPercent <= 0 || savingsPercent < tolerance) {
    const reasonText = savingsPercent <= 0 
      ? "La tua offerta attuale è già la più conveniente sul mercato. Non ci sono offerte migliori disponibili."
      : "La differenza è inferiore al " + Math.round(tolerance * 100) + "% (" + Math.round(savingsPercent * 100) + "% effettivo). Non vale la burocrazia del cambio.";
    return { 
      offer: best, 
      action: "STAY", 
      reason: reasonText
    };
  }
  
  return { 
    offer: best, 
    action: "SWITCH", 
    reason: "Abbiamo trovato un'offerta più conveniente con un risparmio significativo." 
  };
}

function calculateSavings(currentAnnual, bestAnnual) {
  if (!currentAnnual || !bestAnnual || currentAnnual <= 0) {
    return { monthly_eur: null, annual_eur: null, percent: null };
  }
  
  const annual = currentAnnual - bestAnnual;
  const monthly = annual / 12;
  const percent = (annual / currentAnnual) * 100;
  
  return {
    monthly_eur: Math.round(monthly * 100) / 100,
    annual_eur: Math.round(annual * 100) / 100,
    percent: Math.round(percent * 10) / 10
  };
}

function generateExpertCopy(data, commodity) {
  const unit = commodity === "GAS" ? "Smc" : "kWh";
  const identifier = commodity === "GAS" ? "PDR" : "POD";
  
  // Headlines based on decision
  let headline = "";
  let summaryLines = [];
  let prosStay = [];
  let prosSwitch = [];
  let nextSteps = [];
  
  if (data.decision.action === "SWITCH") {
    headline = "Puoi risparmiare passando a " + (data.best_offer?.provider || "un nuovo fornitore");
    summaryLines = [
      "Abbiamo analizzato la tua bolletta " + commodity.toLowerCase() + ".",
      "Risparmio stimato: €" + (data.savings.annual_eur || 0).toFixed(0) + "/anno (" + (data.savings.percent || 0).toFixed(0) + "%).",
      "L'offerta consigliata è a prezzo " + (data.best_offer?.price_type?.toLowerCase() || "variabile") + "."
    ];
    prosStay = [
      "Nessun cambio burocratico",
      "Conosci già il fornitore"
    ];
    prosSwitch = [
      "Risparmio di €" + (data.savings.annual_eur || 0).toFixed(0) + " all'anno",
      "Offerta verificata e attiva oggi",
      data.best_offer?.price_type === "FISSO" ? "Prezzo bloccato per 12-24 mesi" : "Prezzo legato al mercato (può variare)"
    ];
    nextSteps = [
      "Clicca su 'Attiva Offerta Online' per procedere",
      "Tieni a portata di mano IBAN e dati intestatario",
      "Il cambio è automatico, senza interruzioni di servizio"
    ];
  } else if (data.decision.action === "STAY") {
    headline = "Sei già tra i migliori - Resta dove sei ✓";
    summaryLines = [
      "Abbiamo confrontato la tua bolletta " + commodity.toLowerCase() + " con le offerte disponibili.",
      "La tua tariffa attuale è già competitiva.",
      "Non conviene cambiare fornitore in questo momento."
    ];
    prosStay = [
      "Stai già pagando un buon prezzo",
      "Eviti burocrazia inutile"
    ];
    prosSwitch = [];
    nextSteps = [
      "Monitora le offerte periodicamente (ogni 6-12 mesi)",
      "Controlla eventuali bonus sociali se ne hai diritto",
      "Ricarica una nuova bolletta quando vuoi ricontrollare"
    ];
  } else {
    headline = "Dati insufficienti per un'analisi completa";
    summaryLines = [
      "Non abbiamo tutti i dati necessari per un confronto.",
      data.decision.reason,
      "Prova a caricare una bolletta più completa."
    ];
    prosStay = [];
    prosSwitch = [];
    nextSteps = [
      "Carica una bolletta con periodo e importo visibili",
      "Assicurati che sia leggibile (non sfocata)",
      "Contattaci se hai bisogno di aiuto"
    ];
  }
  
  return {
    headline,
    summary_3_lines: summaryLines,
    pros_cons: {
      stay: prosStay,
      switch: prosSwitch
    },
    next_steps: nextSteps,
    detailed_comparison_rows: [
      { label: "Fornitore", current: data.current?.provider || "N/A", best: data.best_offer?.provider || "N/A" },
      { label: "Nome offerta", current: data.current?.offer_name || "N/A", best: data.best_offer?.offer_name || "N/A" },
      { label: "Costo mensile", current: data.current?.monthly_eur ? "€" + data.current.monthly_eur.toFixed(2) : "N/A", best: data.best_offer?.monthly_eur ? "€" + data.best_offer.monthly_eur.toFixed(2) : "N/A" },
      { label: "Costo annuo", current: data.current?.annual_eur ? "€" + data.current.annual_eur.toFixed(2) : "N/A", best: data.best_offer?.annual_eur ? "€" + data.best_offer.annual_eur.toFixed(2) : "N/A" },
      { label: "Tipo prezzo", current: "Attuale", best: data.best_offer?.price_type || "N/A" }
    ],
    disclaimer: "I calcoli sono stime basate sui dati forniti. Il risparmio effettivo può variare in base ai consumi reali e alle condizioni contrattuali."
  };
}

// ==================== MAIN HANDLER ====================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    const { ocr, profilo_utente, offerte_luce, offerte_gas, parametri_business } = await req.json();
    
    if (!ocr) {
      return new Response(JSON.stringify({ error: "Missing OCR data" }), { 
        status: 400, 
        headers: { ...corsHeaders, "content-type": "application/json" } 
      });
    }

    // Build standardized bill object from OCR
    const bill = {
      commodity_hint: ocr.tipo_fornitura?.toUpperCase() || null,
      provider_current: ocr.provider || null,
      offer_name_current: ocr.offerta || null,
      identifiers: {
        POD: ocr.pod || ocr.bolletta_luce?.pod || null,
        PDR: ocr.pdr || ocr.bolletta_gas?.pdr || null
      },
      period: {
        start: ocr.bolletta_luce?.periodo?.data_inizio || ocr.bolletta_gas?.periodo?.data_inizio || null,
        end: ocr.bolletta_luce?.periodo?.data_fine || ocr.bolletta_gas?.periodo?.data_fine || null,
        label: null,
        mesi: ocr.bolletta_luce?.periodo?.mesi || ocr.bolletta_gas?.periodo?.mesi || null
      },
      consumption: {
        kwh: ocr.bolletta_luce?.consumo_annuo_kwh || ocr.bolletta_luce?.consumo_periodo_kwh || null,
        smc: ocr.bolletta_gas?.consumo_annuo_smc || ocr.bolletta_gas?.consumo_periodo_smc || null
      },
      costs: {
        total_eur_luce: ocr.bolletta_luce?.totale_periodo_euro || null,
        total_eur_gas: ocr.bolletta_gas?.totale_periodo_euro || null
      }
    };

    // Step A: Determine commodity
    let commodity_final = determineCommodity(bill);
    
    // Handle legacy tipo_fornitura
    if (commodity_final === "ASK_CLARIFICATION") {
      if (ocr.tipo_fornitura === "luce" || ocr.tipo_fornitura === "electricity") {
        commodity_final = "LUCE";
      } else if (ocr.tipo_fornitura === "gas") {
        commodity_final = "GAS";
      } else if (ocr.tipo_fornitura === "luce+gas") {
        commodity_final = "DUAL";
      }
    }
    
    if (commodity_final === "ASK_CLARIFICATION") {
      return new Response(JSON.stringify({
        commodity_final: "ASK_CLARIFICATION",
        decision: { action: "ASK_CLARIFICATION", reason: "Questa bolletta è GAS o LUCE?" },
        debug: { signals_used: ["commodity_detection_failed"], warnings: ["Impossibile determinare la commodity"] }
      }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

    // Step B: Calculate months equivalent
    let months_equivalent = 1;
    if (bill.period.mesi) {
      months_equivalent = bill.period.mesi;
    } else {
      months_equivalent = calculateMonthsEquivalent(bill.period);
    }

    // Process LUCE if applicable
    let luce_result = null;
    if (commodity_final === "LUCE" || commodity_final === "DUAL") {
      const totalEur = bill.costs.total_eur_luce;
      const monthly = totalEur ? totalEur / months_equivalent : null;
      const annual = monthly ? monthly * 12 : null;
      
      const offers = filterOffersByCommodity(offerte_luce || [], "LUCE");
      const { offer: best, action, reason } = selectBestOffer(offers, annual);
      const savings = best && annual ? calculateSavings(annual, best.estimated_annual_eur) : { monthly_eur: null, annual_eur: null, percent: null };
      
      const current = {
        provider: bill.provider_current,
        offer_name: bill.offer_name_current,
        monthly_eur: monthly ? Math.round(monthly * 100) / 100 : null,
        annual_eur: annual ? Math.round(annual * 100) / 100 : null,
        consumption_annual: { kwh: bill.consumption.kwh, smc: null }
      };
      
      const best_offer = best ? {
        provider: best.provider,
        offer_name: best.offer_name,
        price_type: best.price_type || "VARIABILE",
        monthly_eur: best.estimated_annual_eur ? Math.round(best.estimated_annual_eur / 12 * 100) / 100 : null,
        annual_eur: best.estimated_annual_eur,
        link: best.link || null
      } : null;
      
      const data = { current, best_offer, decision: { action, reason }, savings };
      const expert_copy = generateExpertCopy(data, "LUCE");
      
      luce_result = {
        commodity_final: "LUCE",
        months_equivalent,
        current,
        best_offer,
        decision: { action, reason },
        savings,
        expert_copy,
        debug: {
          signals_used: ["tipo_fornitura", offers.length > 0 ? "offers_filtered" : "no_offers"],
          warnings: []
        }
      };
    }

    // Process GAS if applicable
    let gas_result = null;
    if (commodity_final === "GAS" || commodity_final === "DUAL") {
      const totalEur = bill.costs.total_eur_gas;
      const monthly = totalEur ? totalEur / months_equivalent : null;
      const annual = monthly ? monthly * 12 : null;
      
      const offers = filterOffersByCommodity(offerte_gas || [], "GAS");
      const { offer: best, action, reason } = selectBestOffer(offers, annual);
      const savings = best && annual ? calculateSavings(annual, best.estimated_annual_eur) : { monthly_eur: null, annual_eur: null, percent: null };
      
      const current = {
        provider: bill.provider_current,
        offer_name: bill.offer_name_current,
        monthly_eur: monthly ? Math.round(monthly * 100) / 100 : null,
        annual_eur: annual ? Math.round(annual * 100) / 100 : null,
        consumption_annual: { kwh: null, smc: bill.consumption.smc }
      };
      
      const best_offer = best ? {
        provider: best.provider,
        offer_name: best.offer_name,
        price_type: best.price_type || "VARIABILE",
        monthly_eur: best.estimated_annual_eur ? Math.round(best.estimated_annual_eur / 12 * 100) / 100 : null,
        annual_eur: best.estimated_annual_eur,
        link: best.link || null
      } : null;
      
      const data = { current, best_offer, decision: { action, reason }, savings };
      const expert_copy = generateExpertCopy(data, "GAS");
      
      gas_result = {
        commodity_final: "GAS",
        months_equivalent,
        current,
        best_offer,
        decision: { action, reason },
        savings,
        expert_copy,
        debug: {
          signals_used: ["tipo_fornitura", offers.length > 0 ? "offers_filtered" : "no_offers"],
          warnings: []
        }
      };
    }

    // Return appropriate response based on commodity type
    if (commodity_final === "DUAL") {
      return new Response(JSON.stringify({
        commodity_final: "DUAL",
        luce: luce_result,
        gas: gas_result
      }), { headers: { ...corsHeaders, "content-type": "application/json" } });
    } else if (commodity_final === "LUCE") {
      return new Response(JSON.stringify(luce_result), { headers: { ...corsHeaders, "content-type": "application/json" } });
    } else {
      return new Response(JSON.stringify(gas_result), { headers: { ...corsHeaders, "content-type": "application/json" } });
    }

  } catch (error) {
    console.error("[BILLSNAP-CORE] Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      decision: { action: "INSUFFICIENT_DATA", reason: "Errore interno: " + error.message }
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "content-type": "application/json" } 
    });
  }
});
