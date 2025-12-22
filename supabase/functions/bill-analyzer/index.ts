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


// COST ENGINE - Deterministic annual cost calculation
function computeAnnualCost(data: {
  total_due: number | null;
  period_months: number | null;
  spesa_annua_from_bill: number | null;
}): { value: number | null; source: string; valid: boolean; error?: string } {
  if (data.spesa_annua_from_bill && data.spesa_annua_from_bill > 0) {
    return { value: data.spesa_annua_from_bill, source: "BILL", valid: true };
  }
  if (data.total_due && data.total_due > 0 && data.period_months && data.period_months > 0) {
    const monthly = data.total_due / data.period_months;
    const annual = monthly * 12;
    return { value: Math.round(annual * 100) / 100, source: "CALCULATED", valid: true };
  }
  return { value: null, source: "MISSING", valid: false, error: "Missing total_due or period_months" };
}

// GUARDRAILS - Validate bill data
function validateBillData(data: {
  current_cost_year: number | null;
  consumption_year: number | null;
  saving_year: number | null;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data.current_cost_year || data.current_cost_year <= 0) {
    errors.push("current_cost_year <= 0");
  }
  if (!data.consumption_year || data.consumption_year <= 0) {
    errors.push("consumption_year <= 0");
  }
  if (data.saving_year && data.current_cost_year && data.saving_year > data.current_cost_year) {
    errors.push(`IMPOSSIBLE: saving (${data.saving_year}) > current_cost (${data.current_cost_year})`);
  }
  return { valid: errors.length === 0, errors };
}


// ==================== ENHANCED GUARDRAILS ====================
// CRITICAL: Enforce data quality BEFORE any calculation
interface GuardrailResult {
  valid: boolean;
  errors: string[];
  data_status: 'OK' | 'IN_VERIFICA';
  critical_failures: string[];
}

function validateGuardrailsEnhanced(data: {
  current_cost_year: number | null;
  consumption_year: number | null;
  best_cost_year?: number | null;
  saving_year?: number | null;
}): GuardrailResult {
  const errors: string[] = [];
  const critical_failures: string[] = [];
  
  // Guardrail 1: cost > 0
  if (!data.current_cost_year || data.current_cost_year <= 0) {
    const error = `GUARDRAIL VIOLATION: current_cost_year = ${data.current_cost_year} (must be > 0)`;
    errors.push(error);
    critical_failures.push('cost_invalid');
    console.error(`[GUARDRAIL] ${error}`);
  }
  
  // Guardrail 2: consumption > 0
  if (!data.consumption_year || data.consumption_year <= 0) {
    const error = `GUARDRAIL VIOLATION: consumption_year = ${data.consumption_year} (must be > 0)`;
    errors.push(error);
    critical_failures.push('consumption_invalid');
    console.error(`[GUARDRAIL] ${error}`);
  }
  
  // Guardrail 3: saving <= cost
  if (data.saving_year !== undefined && data.saving_year !== null && data.current_cost_year) {
    if (data.saving_year > data.current_cost_year) {
      const error = `GUARDRAIL VIOLATION: saving (${data.saving_year}€) > current_cost (${data.current_cost_year}€) - IMPOSSIBLE`;
      errors.push(error);
      critical_failures.push('impossible_saving');
      console.error(`[GUARDRAIL] ${error}`);
    }
  }
  
  const valid = errors.length === 0;
  const data_status = valid ? 'OK' : 'IN_VERIFICA';
  
  if (!valid) {
    console.log(`[GUARDRAIL] Validation FAILED. Status: ${data_status}. Errors: ${errors.length}`);
  }
  
  return { valid, errors, data_status, critical_failures };
}
// COMPARISON ENGINE - Calculate offer cost from components
function calculateOfferCost(offer, consumption_year, commodity) {
  if (offer.estimated_annual_eur && offer.estimated_annual_eur > 0) {
    return { valid: true, value: offer.estimated_annual_eur };
  }
  
  const unitPrice = commodity === "GAS"
    ? (offer.prezzo_energia_euro_smc || offer.unit_price_smc)
    : (offer.prezzo_energia_euro_kwh || offer.price_kwh);
  
  const fixedMonthly = offer.quota_fissa_mensile_euro || offer.fixed_fee_monthly || 0;
  
  if (!unitPrice || unitPrice <= 0) {
    return { valid: false, value: null, error: "Missing unit_price" };
  }
  
  const energyCost = unitPrice * consumption_year;
  const fixedCost = fixedMonthly * 12;
  const systemCharges = energyCost * 0.10;
  const total = Math.round((energyCost + fixedCost + systemCharges) * 100) / 100;
  
  return { valid: true, value: total };
}

// COMPARISON ENGINE - Compare offers with exclusion logging
// Returns BOTH best_offer_fissa AND best_offer_variabile
function compareOffers(data) {
  const considered = [];
  const excluded = [];
  
  for (const offer of data.offers) {
    const costCalc = calculateOfferCost(offer, data.consumption_year, data.commodity);
    
    if (!costCalc.valid) {
      excluded.push({
        offer_id: offer.id || offer.nome_offerta || "unknown",
        reason: costCalc.error
      });
      continue;
    }
    
    offer.calculated_annual_cost = costCalc.value;
    considered.push(offer);
  }
  
  // Separate into fixed and variable
  const fixedOffers = considered.filter(o => {
    const tipo = (o.tipo_prezzo || o.tipo_tariffa || '').toLowerCase();
    return tipo.includes('fiss') || tipo === 'fixed';
  });
  const variableOffers = considered.filter(o => {
    const tipo = (o.tipo_prezzo || o.tipo_tariffa || '').toLowerCase();
    return tipo.includes('variabil') || tipo.includes('index') || tipo === 'indexed';
  });
  
  // Sort each by cost
  const sortedFixed = [...fixedOffers].sort((a, b) => a.calculated_annual_cost - b.calculated_annual_cost);
  const sortedVariable = [...variableOffers].sort((a, b) => a.calculated_annual_cost - b.calculated_annual_cost);
  
  const bestFixed = sortedFixed[0] || null;
  const bestVariable = sortedVariable[0] || null;
  
  // Overall best is the cheapest regardless of type
  const sorted = [...considered].sort((a, b) => a.calculated_annual_cost - b.calculated_annual_cost);
  const best = sorted[0] || null;
  
  const saving_year = best ? data.current_cost_year - best.calculated_annual_cost : null;
  const saving_percent = best && data.current_cost_year > 0
    ? (saving_year / data.current_cost_year) * 100 : null;
    
  // Calculate savings for each type
  const savingFixedYear = bestFixed ? data.current_cost_year - bestFixed.calculated_annual_cost : null;
  const savingFixedPercent = bestFixed && data.current_cost_year > 0
    ? (savingFixedYear / data.current_cost_year) * 100 : null;
    
  const savingVariableYear = bestVariable ? data.current_cost_year - bestVariable.calculated_annual_cost : null;
  const savingVariablePercent = bestVariable && data.current_cost_year > 0
    ? (savingVariableYear / data.current_cost_year) * 100 : null;
  
  console.log(`[COMPARE] Considered: ${considered.length} (Fixed: ${fixedOffers.length}, Variable: ${variableOffers.length}), Excluded: ${excluded.length}`);
  excluded.forEach(e => console.log(`[EXCLUDE] ${e.offer_id}: ${e.reason}`));
  
  return {
    best_offer: best,
    best_offer_fissa: bestFixed,
    best_offer_variabile: bestVariable,
    best_cost_year: best?.calculated_annual_cost || null,
    saving_year,
    saving_percent,
    saving_fissa_year: savingFixedYear,
    saving_fissa_percent: savingFixedPercent,
    saving_variabile_year: savingVariableYear,
    saving_variabile_percent: savingVariablePercent,
    offers_considered_count: considered.length,
    offers_excluded_count: excluded.length,
    excluded_reasons: excluded
  };
}

// DECISION ENGINE - Make decision using DB rules
async function makeDecision(data, supabase) {
  const reasons = [];
  
  const { data: rules } = await supabase
    .from("decision_rules")
    .select("*")
    .eq("commodity", data.commodity)
    .eq("active", true)
    .order("version", { ascending: false })
    .limit(1);
  
  const rule = rules?.[0];
  
  if (!rule) {
    return {
      decision: "STAY",
      reasons: ["No active decision rule found"],
      rule_id: null,
      rule_version: null
    };
  }
  
  if (!data.best_cost_year) {
    reasons.push("Nessuna offerta migliore trovata");
    return { decision: "STAY", reasons, rule_id: rule.id, rule_version: rule.version };
  }
  
  if (data.offers_considered_count === 0) {
    reasons.push("Nessuna offerta analizzabile con i dati disponibili");
    return { decision: "STAY", reasons, rule_id: rule.id, rule_version: rule.version };
  }
  
  const meetsEuroThreshold = data.saving_year >= rule.min_saving_eur_year;
  const meetsPercentThreshold = data.saving_percent >= rule.min_saving_percent;
  
  if (meetsEuroThreshold && meetsPercentThreshold) {
    reasons.push(`Risparmio €${data.saving_year}/anno (${data.saving_percent.toFixed(1)}%)`);
    reasons.push(`Supera soglie: €${rule.min_saving_eur_year} e ${rule.min_saving_percent}%`);
    return { decision: "SWITCH", reasons, rule_id: rule.id, rule_version: rule.version };
  }
  
  if (!meetsEuroThreshold) {
    reasons.push(`Risparmio €${data.saving_year} < soglia €${rule.min_saving_eur_year}`);
  }
  if (!meetsPercentThreshold) {
    reasons.push(`Risparmio ${data.saving_percent?.toFixed(1)}% < soglia ${rule.min_saving_percent}%`);
  }
  
  return { decision: "STAY", reasons, rule_id: rule.id, rule_version: rule.version };
}

// AUDIT - Log decision to database
async function logDecision(auditData, supabase) {
  const { error } = await supabase.from("decision_audit").insert({
    upload_id: auditData.upload_id,
    commodity: auditData.commodity,
    current_cost_year: auditData.current_cost_year,
    consumption_year: auditData.consumption_year,
    best_cost_year: auditData.best_cost_year,
    saving_year: auditData.saving_year,
    saving_percent: auditData.saving_percent,
    decision: auditData.decision,
    reasons: auditData.reasons,
    rule_id: auditData.rule_id,
    rule_version: auditData.rule_version,
    offers_considered_count: auditData.offers_considered_count,
    offers_excluded_count: auditData.offers_excluded_count
  });
  
  if (error) {
    console.error("[AUDIT] Failed to log decision:", error);
  } else {
    console.log("[AUDIT] Decision logged:", auditData.decision, auditData.reasons);
  }
}
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

function filterOffersByCommodity(offers, commodity, consumption = null) {
  if (!offers || !Array.isArray(offers)) {
    console.log('[FILTER] No offers or not array:', offers);
    return [];
  }
  
  console.log('[FILTER] Processing', offers.length, 'offers for commodity:', commodity);
  
  return offers.filter(o => {
    const offerCommodity = (o.commodity || "").toUpperCase();
    if (commodity === "GAS") {
      return offerCommodity === "GAS";
    } else if (commodity === "LUCE") {
      return offerCommodity === "LUCE" || offerCommodity === "ELECTRICITY";
    }
    return false;
  }).map(o => {
    // Try to get or calculate estimated_annual_eur
    // Priority: estimated_annual_eur > costo_annuo_stimato > calculate from price * consumption
    
    if (o.estimated_annual_eur && o.estimated_annual_eur > 0) {
      return o; // Already has annual cost
    }
    
    if (o.costo_annuo_stimato && o.costo_annuo_stimato > 0) {
      o.estimated_annual_eur = o.costo_annuo_stimato;
      return o;
    }
    
    // Calculate from unit price + fixed fee
    const unitPrice = commodity === "GAS" 
      ? (o.prezzo_energia_euro_smc || o.unit_price_smc || 0)
      : (o.prezzo_energia_euro_kwh || o.price_kwh || 0);
    const fixedFee = o.quota_fissa_mensile_euro || o.fixed_fee_monthly || 0;
    
    // Use default consumption if not provided
    const cons = consumption || (commodity === "GAS" ? 1200 : 2700);
    
    if (unitPrice > 0) {
      // Calculate: (price * consumption) + (fixed * 12) + system charges + VAT
      const energyCost = unitPrice * cons + (fixedFee * 12);
      const systemCharges = commodity === "GAS" ? (cons * 0.25) + 70 : (cons * 0.06) + 35;
      o.estimated_annual_eur = Math.round((energyCost + systemCharges) * 1.10);
      console.log('[FILTER] Calculated annual cost for', o.nome_offerta || o.fornitore, ':', o.estimated_annual_eur);
    } else {
      console.log('[FILTER] No unit price for offer:', o.nome_offerta || o.fornitore, 'price:', unitPrice);
    }
    
    return o;
  }).filter(o => {
    const hasAnnual = o.estimated_annual_eur && o.estimated_annual_eur > 0;
    if (!hasAnnual) {
      console.log('[FILTER] Filtered out offer (no annual cost):', o.nome_offerta || o.fornitore);
    }
    return hasAnnual;
  });
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
  const tipoBolletta = commodity === "GAS" ? "gas" : "luce";
  
  // Determine consumption level
  const consumo = commodity === "GAS" 
    ? data.current?.consumption_annual?.smc || 0
    : data.current?.consumption_annual?.kwh || 0;
  
  let livelloConsumo = "medio";
  if (commodity === "GAS") {
    if (consumo < 500) livelloConsumo = "basso";
    else if (consumo > 1500) livelloConsumo = "alto";
  } else {
    if (consumo < 1800) livelloConsumo = "basso";
    else if (consumo > 3500) livelloConsumo = "alto";
  }
  
  const costoAttuale = data.current?.annual_eur || 0;
  const costoMigliore = data.best_offer?.annual_eur || 0;
  const risparmioAnnuo = data.savings?.annual_eur || 0;
  const risparmioMensile = data.savings?.monthly_eur || 0;
  const percentuale = data.savings?.percent || 0;
  
  let headline = "";
  let summaryLines = [];
  let prosStay = [];
  let prosSwitch = [];
  let nextSteps = [];
  
  if (data.decision.action === "SWITCH") {
    // SWITCH: Explain why the alternative is better
    headline = "Ti conviene cambiare: ecco perche";
    
    // Build human explanation based on data
    let spiegazione = "Con un consumo " + livelloConsumo + " di " + consumo + " " + unit + "/anno, ";
    
    if (risparmioAnnuo > 100) {
      spiegazione += "passeresti da €" + costoAttuale.toFixed(0) + " a €" + costoMigliore.toFixed(0) + " all'anno. ";
      spiegazione += "Sono €" + risparmioAnnuo.toFixed(0) + " in meno (-" + percentuale.toFixed(0) + "%), circa €" + risparmioMensile.toFixed(0) + "/mese. ";
    } else {
      spiegazione += "risparmieresti €" + risparmioMensile.toFixed(0) + " al mese, €" + risparmioAnnuo.toFixed(0) + " all'anno. ";
    }
    
    // What drives savings
    if (livelloConsumo === "alto") {
      spiegazione += "Nel tuo caso incide molto il prezzo energia: anche pochi centesimi in meno fanno la differenza. ";
    } else if (livelloConsumo === "basso") {
      spiegazione += "Con consumi bassi, la quota fissa pesa: l'offerta alternativa ha costi fissi piu bassi. ";
    } else {
      spiegazione += "Il risparmio deriva sia dal prezzo energia piu basso sia dalla quota fissa ridotta. ";
    }
    
    // Price type info
    const tipoPrezzo = data.best_offer?.price_type || "VARIABILE";
    if (tipoPrezzo === "FISSO") {
      spiegazione += "Il prezzo e bloccato per 12-24 mesi: nessuna sorpresa in bolletta.";
    } else {
      spiegazione += "E un prezzo variabile: oggi e conveniente, ma puo oscillare col mercato.";
    }
    
    summaryLines = [spiegazione];
    prosSwitch = [
      "Risparmio di €" + risparmioAnnuo.toFixed(0) + " all'anno",
      tipoPrezzo === "FISSO" ? "Prezzo bloccato, zero sorprese" : "Prezzo aggressivo, legato al mercato",
      "Cambio automatico senza interruzioni"
    ];
    prosStay = [
      "Nessuna burocrazia",
      "Fornitore gia conosciuto"
    ];
    nextSteps = [
      "Clicca Attiva Offerta per procedere",
      "Tieni IBAN e codice fiscale a portata",
      "Il passaggio e gratuito e senza interruzioni"
    ];
    
  } else if (data.decision.action === "STAY") {
    // STAY: Explain why alternatives DON'T work
    headline = "Resta dove sei";
    
    let spiegazione = "La tua offerta attuale è già la più conveniente sul mercato. Non ci sono offerte migliori disponibili.";
    
    // Se ci sono alternative ma non convenienti
    if (costoMigliore > 0 && costoMigliore >= costoAttuale) {
      const differenza = Math.abs(costoMigliore - costoAttuale);
      if (differenza > 50) {
        spiegazione = "Le alternative costerebbero €" + costoMigliore.toFixed(0) + "/anno contro i tuoi €" + costoAttuale.toFixed(0) + ". Resteresti a pagare €" + differenza.toFixed(0) + "/anno in più. Non vale la pena cambiare.";
      } else {
        spiegazione = "Le migliori alternative hanno prezzi praticamente identici al tuo (differenza < €50/anno). Non ha senso cambiare per così poco.";
      }
    }
    
    summaryLines = [spiegazione];
    prosStay = [
      "Tariffa gia competitiva",
      "Nessuna burocrazia inutile"
    ];
    prosSwitch = [];
    nextSteps = [
      "Monitora le offerte ogni 6 mesi",
      "Verifica eventuali bonus sociali ISEE",
      "Ricarica una nuova bolletta quando vuoi"
    ];
    
  } else {
    // INSUFFICIENT_DATA or ASK_CLARIFICATION
    headline = "Dati insufficienti per l'analisi";
    summaryLines = [
      "Non abbiamo abbastanza informazioni per confrontare le offerte. " +
      (data.decision?.reason || "Carica una bolletta piu completa o inserisci i dati manualmente.")
    ];
    prosStay = [];
    prosSwitch = [];
    nextSteps = [
      "Carica una bolletta con periodo e importo leggibili",
      "Oppure inserisci i dati manualmente",
      "Contattaci se hai difficolta"
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
      { label: "Nome offerta", current: data.current?.offer_name || "Attuale", best: data.best_offer?.offer_name || "N/A" },
      { label: "Costo mensile", current: data.current?.monthly_eur ? "€" + data.current.monthly_eur.toFixed(2) : "N/A", best: data.best_offer?.monthly_eur ? "€" + data.best_offer.monthly_eur.toFixed(2) : "N/A" },
      { label: "Costo annuo", current: data.current?.annual_eur ? "€" + data.current.annual_eur.toFixed(2) : "N/A", best: data.best_offer?.annual_eur ? "€" + data.best_offer.annual_eur.toFixed(2) : "N/A" },
      { label: "Tipo prezzo", current: "Attuale", best: data.best_offer?.price_type || "N/A" }
    ],
    disclaimer: "I calcoli sono stime basate sui dati forniti. Il risparmio effettivo dipende dai consumi reali."
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
      },
      details: {
        unit_price_kwh: ocr.bolletta_luce?.prezzo_unitario_kwh || null,
        fixed_fee_luce: ocr.bolletta_luce?.quota_fissa_mensile || null,
        unit_price_smc: ocr.bolletta_gas?.prezzo_unitario_smc || null,
        fixed_fee_gas: ocr.bolletta_gas?.quota_fissa_mensile || null
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
      
      // Separate into fixed and variable offers
      const fixedOffers = offers.filter(o => {
        const tipo = (o.tipo_prezzo || o.pricing_type || '').toLowerCase();
        return tipo.includes('fiss') || tipo === 'fixed' || tipo === 'fisso';
      });
      const variableOffers = offers.filter(o => {
        const tipo = (o.tipo_prezzo || o.pricing_type || '').toLowerCase();
        return tipo.includes('variabil') || tipo.includes('index') || tipo === 'indexed' || tipo === 'variabile';
      });
      
      // Sort each by cost and get best
      const sortedFixed = [...fixedOffers].sort((a, b) => a.estimated_annual_eur - b.estimated_annual_eur);
      const sortedVariable = [...variableOffers].sort((a, b) => a.estimated_annual_eur - b.estimated_annual_eur);
      const bestFixed = sortedFixed[0] || null;
      const bestVariable = sortedVariable[0] || null;
      
      console.log('[LUCE] Fixed offers:', fixedOffers.length, 'Variable offers:', variableOffers.length);
      console.log('[LUCE] Best fixed:', bestFixed?.nome_offerta, bestFixed?.estimated_annual_eur);
      console.log('[LUCE] Best variable:', bestVariable?.nome_offerta, bestVariable?.estimated_annual_eur);
      
      // CRITICAL: Intelligent recommendation logic
      let recommendedOffer = null;
      let recommendationReason = '';
      
      if (annual && bestFixed && bestVariable) {
        const fixedCost = bestFixed.estimated_annual_eur;
        const variableCost = bestVariable.estimated_annual_eur;
        const fixedSavings = annual - fixedCost;
        const variableSavings = annual - variableCost;
        const fixedSavingsPercent = (fixedSavings / annual) * 100;
        const variableSavingsPercent = (variableSavings / annual) * 100;
        
        console.log('[LUCE] Current cost:', annual, '€');
        console.log('[LUCE] Fixed savings:', fixedSavings, '€', `(${fixedSavingsPercent.toFixed(1)}%)`);
        console.log('[LUCE] Variable savings:', variableSavings, '€', `(${variableSavingsPercent.toFixed(1)}%)`);
        
        if (variableCost >= fixedCost) {
          recommendedOffer = bestFixed;
          recommendationReason = `Fisso costa meno (€${Math.round(fixedCost)} vs €${Math.round(variableCost)} variabile)`;
          console.log('[LUCE] RECOMMENDATION: Fixed (cheaper than variable)');
        } else if ((fixedCost - variableCost) > (annual * 0.1)) {
          recommendedOffer = bestVariable;
          recommendationReason = `Variabile offre risparmio significativo (€${Math.round(fixedCost - variableCost)} in più rispetto al fisso)`;
          console.log('[LUCE] RECOMMENDATION: Variable (meaningfully cheaper)');
        } else {
          recommendedOffer = bestFixed;
          recommendationReason = `Fisso offre miglior rapporto sicurezza/risparmio (differenza < 10%)`;
          console.log('[LUCE] RECOMMENDATION: Fixed (safety first)');
        }
      } else if (bestFixed && !bestVariable) {
        recommendedOffer = bestFixed;
        recommendationReason = 'Solo offerte fisse disponibili';
      } else if (bestVariable && !bestFixed) {
        recommendedOffer = bestVariable;
        recommendationReason = 'Solo offerte variabili disponibili';
      }
      
      console.log('[LUCE] FINAL RECOMMENDATION:', recommendedOffer?.nome_offerta, '-', recommendationReason);
      
      const current = {
        provider: bill.provider_current,
        offer_name: bill.offer_name_current,
        monthly_eur: monthly ? Math.round(monthly * 100) / 100 : null,
        annual_eur: annual ? Math.round(annual * 100) / 100 : null,
        consumption_annual: { kwh: bill.consumption.kwh, smc: null },
        details: {
          price_kwh: bill.details.unit_price_kwh,
          fixed_fee_monthly: bill.details.fixed_fee_luce
        }
      };
      
      const formatOffer = (o) => o ? {
        id: o.id,
        fornitore: o.fornitore || o.provider || "Sconosciuto",
        provider: o.fornitore || o.provider || "Sconosciuto",
        nome_offerta: o.nome_offerta || o.offer_name || o.plan_name || "Offerta",
        offer_name: o.nome_offerta || o.offer_name || o.plan_name || "Offerta",
        tipo_prezzo: o.tipo_prezzo || o.price_type || o.pricing_type || "variabile",
        price_type: o.tipo_prezzo || o.price_type || o.pricing_type || "VARIABILE",
        monthly_eur: o.estimated_annual_eur ? Math.round(o.estimated_annual_eur / 12 * 100) / 100 : null,
        annual_eur: o.estimated_annual_eur,
        calculated_annual_cost: o.estimated_annual_eur,
        link: o.redirect_url || o.url_offerta || o.link_affiliazione || o.link || null,
        link_affiliazione: o.link_affiliazione || o.redirect_url || o.url_offerta || o.link || null,
        prezzo_energia_euro_kwh: o.prezzo_energia_euro_kwh || o.price_kwh || null,
        quota_fissa_mensile: o.quota_fissa_mensile_euro || o.quota_fissa_mensile || o.fixed_fee_monthly || null,
        tipo_fornitura: 'luce'
      } : null;
      
      const best_offer = formatOffer(best);
      const best_offer_fissa = formatOffer(bestFixed);
      const best_offer_variabile = formatOffer(bestVariable);
      
      console.log('[LUCE] best_offer_fissa:', best_offer_fissa?.nome_offerta);
      console.log('[LUCE] best_offer_variabile:', best_offer_variabile?.nome_offerta);
      
      const data = { current, best_offer, decision: { action, reason }, savings };
      const expert_copy = generateExpertCopy(data, "LUCE");
      
      luce_result = {
        commodity_final: "LUCE",
        months_equivalent,
        current,
        best_offer,
        best_offer_fissa,
        best_offer_variabile,
        decision: { action, reason },
        savings,
        expert_copy,
        debug: {
          signals_used: ["tipo_fornitura", offers.length > 0 ? "offers_filtered" : "no_offers"],
          warnings: [],
          fixed_count: fixedOffers.length,
          variable_count: variableOffers.length
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
      
      // Separate into fixed and variable offers
      const fixedOffers = offers.filter(o => {
        const tipo = (o.tipo_prezzo || o.pricing_type || '').toLowerCase();
        return tipo.includes('fiss') || tipo === 'fixed' || tipo === 'fisso';
      });
      const variableOffers = offers.filter(o => {
        const tipo = (o.tipo_prezzo || o.pricing_type || '').toLowerCase();
        return tipo.includes('variabil') || tipo.includes('index') || tipo === 'indexed' || tipo === 'variabile';
      });
      
      // Sort each by cost and get best
      const sortedFixed = [...fixedOffers].sort((a, b) => a.estimated_annual_eur - b.estimated_annual_eur);
      const sortedVariable = [...variableOffers].sort((a, b) => a.estimated_annual_eur - b.estimated_annual_eur);
      const bestFixed = sortedFixed[0] || null;
      const bestVariable = sortedVariable[0] || null;
      
      console.log('[GAS] Fixed offers:', fixedOffers.length, 'Variable offers:', variableOffers.length);
      console.log('[GAS] Best fixed:', bestFixed?.nome_offerta, bestFixed?.estimated_annual_eur);
      console.log('[GAS] Best variable:', bestVariable?.nome_offerta, bestVariable?.estimated_annual_eur);
      
      // CRITICAL: Intelligent recommendation logic
      let recommendedOffer = null;
      let recommendationReason = '';
      
      if (annual && bestFixed && bestVariable) {
        const fixedCost = bestFixed.estimated_annual_eur;
        const variableCost = bestVariable.estimated_annual_eur;
        const fixedSavings = annual - fixedCost;
        const variableSavings = annual - variableCost;
        const fixedSavingsPercent = (fixedSavings / annual) * 100;
        const variableSavingsPercent = (variableSavings / annual) * 100;
        
        console.log('[GAS] Current cost:', annual, '€');
        console.log('[GAS] Fixed savings:', fixedSavings, '€', `(${fixedSavingsPercent.toFixed(1)}%)`);
        console.log('[GAS] Variable savings:', variableSavings, '€', `(${variableSavingsPercent.toFixed(1)}%)`);
        
        if (variableCost >= fixedCost) {
          recommendedOffer = bestFixed;
          recommendationReason = `Fisso costa meno (€${Math.round(fixedCost)} vs €${Math.round(variableCost)} variabile)`;
          console.log('[GAS] RECOMMENDATION: Fixed (cheaper than variable)');
        } else if ((fixedCost - variableCost) > (annual * 0.1)) {
          recommendedOffer = bestVariable;
          recommendationReason = `Variabile offre risparmio significativo (€${Math.round(fixedCost - variableCost)} in più rispetto al fisso)`;
          console.log('[GAS] RECOMMENDATION: Variable (meaningfully cheaper)');
        } else {
          recommendedOffer = bestFixed;
          recommendationReason = `Fisso offre miglior rapporto sicurezza/risparmio (differenza < 10%)`;
          console.log('[GAS] RECOMMENDATION: Fixed (safety first)');
        }
      } else if (bestFixed && !bestVariable) {
        recommendedOffer = bestFixed;
        recommendationReason = 'Solo offerte fisse disponibili';
      } else if (bestVariable && !bestFixed) {
        recommendedOffer = bestVariable;
        recommendationReason = 'Solo offerte variabili disponibili';
      }
      
      console.log('[GAS] FINAL RECOMMENDATION:', recommendedOffer?.nome_offerta, '-', recommendationReason);
      
      const current = {
        provider: bill.provider_current,
        offer_name: bill.offer_name_current,
        monthly_eur: monthly ? Math.round(monthly * 100) / 100 : null,
        annual_eur: annual ? Math.round(annual * 100) / 100 : null,
        consumption_annual: { kwh: null, smc: bill.consumption.smc },
        details: {
          price_smc: bill.details.unit_price_smc,
          fixed_fee_monthly: bill.details.fixed_fee_gas
        }
      };
      
      const formatOffer = (o) => o ? {
        id: o.id,
        fornitore: o.fornitore || o.provider || "Sconosciuto",
        provider: o.fornitore || o.provider || "Sconosciuto",
        nome_offerta: o.nome_offerta || o.offer_name || o.plan_name || "Offerta",
        offer_name: o.nome_offerta || o.offer_name || o.plan_name || "Offerta",
        tipo_prezzo: o.tipo_prezzo || o.price_type || o.pricing_type || "variabile",
        price_type: o.tipo_prezzo || o.price_type || o.pricing_type || "VARIABILE",
        monthly_eur: o.estimated_annual_eur ? Math.round(o.estimated_annual_eur / 12 * 100) / 100 : null,
        annual_eur: o.estimated_annual_eur,
        calculated_annual_cost: o.estimated_annual_eur,
        link: o.redirect_url || o.url_offerta || o.link_affiliazione || o.link || null,
        link_affiliazione: o.link_affiliazione || o.redirect_url || o.url_offerta || o.link || null,
        prezzo_energia_euro_smc: o.prezzo_energia_euro_smc || o.price_smc || null,
        quota_fissa_mensile: o.quota_fissa_mensile_euro || o.quota_fissa_mensile || o.fixed_fee_monthly || null,
        tipo_fornitura: 'gas'
      } : null;
      
      const best_offer = formatOffer(best);
      const best_offer_fissa = formatOffer(bestFixed);
      const best_offer_variabile = formatOffer(bestVariable);
      
      console.log('[GAS] best_offer_fissa:', best_offer_fissa?.nome_offerta);
      console.log('[GAS] best_offer_variabile:', best_offer_variabile?.nome_offerta);
      
      const data = { current, best_offer, decision: { action, reason }, savings };
      const expert_copy = generateExpertCopy(data, "GAS");
      
      gas_result = {
        commodity_final: "GAS",
        months_equivalent,
        current,
        best_offer,
        best_offer_fissa,
        best_offer_variabile,
        decision: { action, reason },
        savings,
        expert_copy,
        debug: {
          signals_used: ["tipo_fornitura", offers.length > 0 ? "offers_filtered" : "no_offers"],
          warnings: [],
          fixed_count: fixedOffers.length,
          variable_count: variableOffers.length
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
