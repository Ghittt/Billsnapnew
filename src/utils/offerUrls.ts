// Utility function to generate offer URLs based on provider name
// Updated December 2025 - FIXED matching order to prevent false positives
export function getOfferUrl(provider: string, planName: string): string {
  const p = (provider || '').toLowerCase().trim();
  const plan = (planName || '').toLowerCase();
  
  // IMPORTANT: Check more specific names FIRST to avoid false matches
  // e.g., "Sorgenia" contains "eni" so we must check Sorgenia before Eni
  
  // Sorgenia - MUST be before Eni check (contains "eni" in name)
  if (p.includes('sorgenia')) {
    return 'https://www.sorgenia.it/offerte';
  }
  
  // Eni Plenitude - check after Sorgenia
  if (p === 'eni' || p === 'plenitude' || p === 'eni plenitude' || p.includes('plenitude')) {
    return 'https://eniplenitude.com/offerte-luce-e-gas';
  }
  
  // Pulsee
  if (p.includes('pulsee')) {
    return 'https://www.pulsee.it/';
  }
  
  // Enel Energia
  if (p.includes('enel')) {
    return 'https://www.enel.it/it/luce-gas/offerte';
  }
  
  // A2A Energia
  if (p.includes('a2a')) {
    return 'https://www.a2aenergia.eu/offerte';
  }
  
  // Edison Energia
  if (p.includes('edison')) {
    return 'https://www.edison.it/offerte';
  }
  
  // Illumia
  if (p.includes('illumia')) {
    return 'https://www.illumia.it/casa/';
  }
  
  // Wekiwi
  if (p.includes('wekiwi')) {
    return 'https://www.wekiwi.it/casa/';
  }
  
  // Iren Luce Gas e Servizi
  if (p.includes('iren')) {
    return 'https://www.irenlucegas.it/casa';
  }
  
  // Hera Comm
  if (p.includes('hera')) {
    return 'https://www.heracomm.it/casa';
  }
  
  // Axpo Italia
  if (p.includes('axpo')) {
    return 'https://www.axpo.com/it/it/privati.html';
  }
  
  // Engie Italia
  if (p.includes('engie')) {
    return 'https://www.engie.it/offerte';
  }
  
  // Acea Energia
  if (p.includes('acea')) {
    return 'https://www.acea.it/offerte-luce-gas';
  }
  
  // Optima Italia
  if (p.includes('optima')) {
    return 'https://www.optimaitalia.com/offerte';
  }
  
  // Green Network Energy
  if (p.includes('green network')) {
    return 'https://www.greennetworkenergy.it/offerte';
  }
  
  // E.ON Energia
  if (p.includes('e.on') || p === 'eon') {
    return 'https://www.eon-energia.com/offerte.html';
  }
  
  // Fastweb Energia
  if (p.includes('fastweb')) {
    return 'https://www.fastweb.it/energia/';
  }
  
  // Duferco Energia
  if (p.includes('duferco')) {
    return 'https://www.dufercoenergia.com/';
  }
  
  // Servizio Elettrico Nazionale
  if (p.includes('servizio elettrico') || p === 'sen') {
    return 'https://www.servizioelettriconazionale.it/';
  }
  
  // Tate Energia
  if (p.includes('tate')) {
    return 'https://www.tate.it/';
  }
  
  // Alperia
  if (p.includes('alperia')) {
    return 'https://www.alperia.eu/offerte';
  }
  
  // Dolomiti Energia
  if (p.includes('dolomiti')) {
    return 'https://www.dolomitienergia.it/casa';
  }
  
  // CVA Energie
  if (p.includes('cva')) {
    return 'https://www.cva-energie.it/';
  }
  
  // NeN
  if (p === 'nen' || p.includes('nen energia')) {
    return 'https://nen.it/';
  }

  // Octopus Energy
  if (p.includes('octopus')) {
    return 'https://octopusenergy.it/';
  }
  
  // Fallback: Google search for the specific offer
  const searchQuery = `${provider} ${planName} offerta luce gas attiva`;
  return `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
}
