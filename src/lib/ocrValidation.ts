// OCR validation utilities for BillSnap

export const POD_REGEX = /^IT[0-9A-Z]{10,25}$/;
export const PDR_REGEX = /^\d{14}$/;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePOD = (pod: string | null): ValidationResult => {
  if (!pod) {
    return { isValid: false, errors: ['POD mancante'] };
  }
  
  if (!POD_REGEX.test(pod)) {
    return { 
      isValid: false, 
      errors: ['POD non valido. Formato atteso: IT seguito da 10-25 caratteri alfanumerici'] 
    };
  }
  
  return { isValid: true, errors: [] };
};

export const validatePDR = (pdr: string | null): ValidationResult => {
  if (!pdr) {
    return { isValid: false, errors: ['PDR mancante'] };
  }
  
  if (!PDR_REGEX.test(pdr)) {
    return { 
      isValid: false, 
      errors: ['PDR non valido. Formato atteso: 14 cifre'] 
    };
  }
  
  return { isValid: true, errors: [] };
};

export const normalizeNumber = (
  value: any, 
  min: number, 
  max: number, 
  defaultValue: number | null = null
): number | null => {
  if (value === null || value === undefined) return defaultValue;
  
  // Handle string values with comma as decimal separator
  const numStr = typeof value === 'string' ? value.replace(',', '.') : String(value);
  const num = parseFloat(numStr);
  
  if (isNaN(num)) return defaultValue;
  if (num < min || num > max) return defaultValue;
  
  return num;
};

export const validateOCRResult = (data: any): ValidationResult => {
  const errors: string[] = [];
  
  // Validate total_cost_eur
  const totalCost = normalizeNumber(data.total_cost_eur, 50, 5000);
  if (!totalCost) {
    errors.push('Importo totale non valido (range: 50-5000 €)');
  }
  
  // Validate annual_kwh
  const annualKwh = normalizeNumber(data.annual_kwh, 200, 10000);
  if (!annualKwh) {
    errors.push('Consumo annuo non valido (range: 200-10000 kWh)');
  }
  
  // Validate unit_price_eur_kwh
  const unitPrice = normalizeNumber(data.unit_price_eur_kwh, 0.05, 2.0);
  if (data.unit_price_eur_kwh && !unitPrice) {
    errors.push('Prezzo unitario non valido (range: 0.05-2.0 €/kWh)');
  }
  
  // Validate POD if present
  if (data.pod) {
    const podValidation = validatePOD(data.pod);
    if (!podValidation.isValid) {
      errors.push(...podValidation.errors);
    }
  }
  
  // Validate PDR if present
  if (data.pdr) {
    const pdrValidation = validatePDR(data.pdr);
    if (!pdrValidation.isValid) {
      errors.push(...pdrValidation.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const calculateConfidenceScore = (data: any): number => {
  let score = 1.0;
  
  // Decrease score for missing critical fields
  if (!data.total_cost_eur || data.total_cost_eur <= 0) {
    score *= 0.5;
  }
  
  if (!data.annual_kwh || data.annual_kwh <= 0) {
    score *= 0.7;
  }
  
  // Decrease score for out-of-range values
  if (data.unit_price_eur_kwh) {
    if (data.unit_price_eur_kwh < 0.05 || data.unit_price_eur_kwh > 2.0) {
      score *= 0.7;
    }
  }
  
  if (data.annual_kwh) {
    if (data.annual_kwh < 200 || data.annual_kwh > 10000) {
      score *= 0.7;
    }
  }
  
  // Decrease score for invalid POD/PDR
  if (data.pod && !POD_REGEX.test(data.pod)) {
    score *= 0.85;
  }
  
  if (data.pdr && !PDR_REGEX.test(data.pdr)) {
    score *= 0.85;
  }
  
  return Math.max(0, Math.min(1, score));
};
