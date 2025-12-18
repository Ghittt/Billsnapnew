// Template-based parsers for top Italian energy providers
// Regex and anchor-based extraction for high reliability

export interface TemplateResult {
  fornitore?: string;
  tipo?: 'luce' | 'gas';
  pod?: string;
  pdr?: string;
  consumo_annuo_kwh?: number;
  consumo_annuo_smc?: number;
  prezzo_energia_eur_kwh?: number;
  prezzo_gas_eur_smc?: number;
  quota_fissa_mese_eur?: number;
  spesa_annua_totale_eur?: number;
  confidence: Record<string, number>;
  provider_detected: string;
}

// Regex patterns
const PATTERNS = {
  pod: /\b(IT[0-9A-Z]{10,25})\b/i,
  pdr: /\b(\d{14})\b/,
  prezzo_kwh: /(?:prezzo|energia|pe)[\s\S]{0,40}?([0-9]+[.,][0-9]{2,4})\s*€?\s*\/?\s*kWh/i,
  prezzo_smc: /(?:prezzo|gas|pg)[\s\S]{0,40}?([0-9]+[.,][0-9]{2,4})\s*€?\s*\/?\s*smc/i,
  consumo_kwh: /(?:consumo|annuo|totale)[\s\S]{0,60}?([0-9]{3,5})\s*kWh/i,
  consumo_smc: /(?:consumo|annuo|totale)[\s\S]{0,60}?([0-9]{2,4})\s*smc/i,
  quota_fissa: /(?:quota|fissa|canone)[\s\S]{0,40}?([0-9]+[.,][0-9]{1,2})\s*€?\s*\/?\s*mese/i,
  spesa_totale: /(?:totale|spesa|importo)[\s\S]{0,40}?([0-9]+[.,][0-9]{2})\s*€/i,
};

// Normalize number from Italian format
function normalizeNumber(str: string): number | null {
  if (!str) return null;
  const normalized = str.replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

// Extract with pattern and validate range
function extractField(
  text: string,
  pattern: RegExp,
  min?: number,
  max?: number
): { value: number | string | null; confidence: number } {
  const match = text.match(pattern);
  if (!match || !match[1]) return { value: null, confidence: 0 };

  const raw = match[1];
  const num = normalizeNumber(raw);

  if (num === null) {
    return { value: raw, confidence: 0.3 };
  }

  // Range validation
  if (min !== undefined && max !== undefined) {
    if (num < min || num > max) {
      return { value: null, confidence: 0 };
    }
  }

  return { value: num, confidence: 0.95 };
}

// Detect provider from text
export function detectProvider(text: string): string | null {
  const textLower = text.toLowerCase();
  
  const providers = [
    { name: 'Enel', keywords: ['enel energia', 'enel spa'] },
    { name: 'Edison', keywords: ['edison energia', 'edison spa'] },
    { name: 'A2A', keywords: ['a2a energia', 'a2a spa'] },
    { name: 'Plenitude', keywords: ['plenitude', 'eni plenitude'] },
    { name: 'Iren', keywords: ['iren mercato', 'iren spa'] },
    { name: 'Hera', keywords: ['hera comm', 'hera spa'] },
  ];

  for (const provider of providers) {
    for (const keyword of provider.keywords) {
      if (textLower.includes(keyword)) {
        return provider.name;
      }
    }
  }

  return null;
}

// Main template parser
export function parseWithTemplate(text: string): TemplateResult {
  const provider = detectProvider(text);
  const confidence: Record<string, number> = {};

  // Detect tipo (luce vs gas)
  const hasPOD = PATTERNS.pod.test(text);
  const hasPDR = PATTERNS.pdr.test(text);
  const tipo = hasPOD ? 'luce' : hasPDR ? 'gas' : undefined;

  // Extract POD/PDR
  const podMatch = text.match(PATTERNS.pod);
  const pod = podMatch ? podMatch[1] : undefined;
  if (pod) confidence['pod'] = 0.98;

  const pdrMatch = text.match(PATTERNS.pdr);
  const pdr = pdrMatch ? pdrMatch[1] : undefined;
  if (pdr) confidence['pdr'] = 0.98;

  // Extract consumption
  const consumoKwhResult = extractField(text, PATTERNS.consumo_kwh, 200, 10000);
  const consumo_annuo_kwh = consumoKwhResult.value as number | undefined;
  if (consumo_annuo_kwh) confidence['consumo_annuo_kwh'] = consumoKwhResult.confidence;

  const consumoSmcResult = extractField(text, PATTERNS.consumo_smc, 50, 2000);
  const consumo_annuo_smc = consumoSmcResult.value as number | undefined;
  if (consumo_annuo_smc) confidence['consumo_annuo_smc'] = consumoSmcResult.confidence;

  // Extract prices
  const prezzoKwhResult = extractField(text, PATTERNS.prezzo_kwh, 0.10, 0.80);
  const prezzo_energia_eur_kwh = prezzoKwhResult.value as number | undefined;
  if (prezzo_energia_eur_kwh) confidence['prezzo_energia_eur_kwh'] = prezzoKwhResult.confidence;

  const prezzoSmcResult = extractField(text, PATTERNS.prezzo_smc, 0.20, 2.50);
  const prezzo_gas_eur_smc = prezzoSmcResult.value as number | undefined;
  if (prezzo_gas_eur_smc) confidence['prezzo_gas_eur_smc'] = prezzoSmcResult.confidence;

  // Extract fixed fee
  const quotaResult = extractField(text, PATTERNS.quota_fissa, 0, 50);
  const quota_fissa_mese_eur = quotaResult.value as number | undefined;
  if (quota_fissa_mese_eur) confidence['quota_fissa_mese_eur'] = quotaResult.confidence;

  // Extract total spend
  const spesaResult = extractField(text, PATTERNS.spesa_totale);
  const spesa_annua_totale_eur = spesaResult.value as number | undefined;
  if (spesa_annua_totale_eur) confidence['spesa_annua_totale_eur'] = spesaResult.confidence;

  return {
    fornitore: provider || undefined,
    tipo,
    pod,
    pdr,
    consumo_annuo_kwh,
    consumo_annuo_smc,
    prezzo_energia_eur_kwh,
    prezzo_gas_eur_smc,
    quota_fissa_mese_eur,
    spesa_annua_totale_eur,
    confidence,
    provider_detected: provider || 'unknown',
  };
}

// Merge template and LLM results with prioritization
export function mergeResults(template: TemplateResult, llm: any): any {
  const merged: any = { ...llm };
  
  // Template wins on key fields if within range and high confidence
  const keyFields = [
    'pod',
    'pdr',
    'consumo_annuo_kwh',
    'consumo_annuo_smc',
    'prezzo_energia_eur_kwh',
    'prezzo_gas_eur_smc',
    'quota_fissa_mese_eur',
  ];

  for (const field of keyFields) {
    const templateValue = (template as any)[field];
    const templateConf = template.confidence[field] || 0;
    const llmConf = llm.confidence?.[field] || 0;

    // Template wins if it has the value with high confidence
    if (templateValue !== undefined && templateConf >= 0.9) {
      merged[field] = templateValue;
      if (!merged.confidence) merged.confidence = {};
      merged.confidence[field] = templateConf;
    }
    // Otherwise, use LLM if it has high confidence
    else if (llm[field] !== undefined && llmConf >= 0.9) {
      merged[field] = llm[field];
    }
    // If both uncertain, prefer template if available
    else if (templateValue !== undefined) {
      merged[field] = templateValue;
      if (!merged.confidence) merged.confidence = {};
      merged.confidence[field] = templateConf;
    }
  }

  // Always use detected provider from template if available
  if (template.provider_detected && template.provider_detected !== 'unknown') {
    merged.fornitore = template.fornitore;
    merged.provider_detected = template.provider_detected;
  }

  return merged;
}
