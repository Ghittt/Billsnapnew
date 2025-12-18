// Provider Homepage URLs - STABLE, NEVER BREAK
// Updated December 2025 - Only homepage URLs to avoid 404s
export function getOfferUrl(provider: string, planName: string): string {
  const p = (provider || '').toLowerCase().trim();
  
  // IMPORTANT: All URLs are HOMEPAGE only - no internal pages that can break
  
  // Sorgenia - MUST be before Eni (contains "eni")
  if (p.includes('sorgenia')) return 'https://www.sorgenia.it/';
  
  // Eni Plenitude
  if (p === 'eni' || p === 'plenitude' || p === 'eni plenitude' || p.includes('plenitude')) {
    return 'https://eniplenitude.com/';
  }
  
  // Pulsee
  if (p.includes('pulsee')) return 'https://www.pulsee.it/';
  
  // Enel Energia
  if (p.includes('enel')) return 'https://www.enel.it/';
  
  // A2A Energia
  if (p.includes('a2a')) return 'https://www.a2aenergia.eu/';
  
  // Edison Energia
  if (p.includes('edison')) return 'https://www.edison.it/';
  
  // Illumia
  if (p.includes('illumia')) return 'https://www.illumia.it/';
  
  // Wekiwi
  if (p.includes('wekiwi')) return 'https://www.wekiwi.it/';
  
  // Iren Luce Gas e Servizi
  if (p.includes('iren')) return 'https://www.irenlucegas.it/';
  
  // Hera Comm
  if (p.includes('hera')) return 'https://www.heracomm.it/';
  
  // Axpo Italia
  if (p.includes('axpo')) return 'https://www.axpo.com/it/';
  
  // Engie Italia
  if (p.includes('engie')) return 'https://www.engie.it/';
  
  // Acea Energia
  if (p.includes('acea')) return 'https://www.acea.it/';
  
  // Optima Italia
  if (p.includes('optima')) return 'https://www.optimaitalia.com/';
  
  // Green Network Energy
  if (p.includes('green network')) return 'https://www.greennetworkenergy.it/';
  
  // E.ON Energia
  if (p.includes('e.on') || p === 'eon') return 'https://www.eon-energia.com/';
  
  // Fastweb Energia
  if (p.includes('fastweb')) return 'https://www.fastweb.it/';
  
  // Duferco Energia
  if (p.includes('duferco')) return 'https://www.dufercoenergia.com/';
  
  // Servizio Elettrico Nazionale
  if (p.includes('servizio elettrico') || p === 'sen') return 'https://www.servizioelettriconazionale.it/';
  
  // Tate Energia
  if (p.includes('tate')) return 'https://www.tate.it/';
  
  // Alperia
  if (p.includes('alperia')) return 'https://www.alperia.eu/';
  
  // Dolomiti Energia
  if (p.includes('dolomiti')) return 'https://www.dolomitienergia.it/';
  
  // CVA Energie
  if (p.includes('cva')) return 'https://www.cva-energie.it/';
  
  // NeN
  if (p === 'nen' || p.includes('nen energia')) return 'https://nen.it/';

  // Octopus Energy
  if (p.includes('octopus')) return 'https://octopusenergy.it/';
  
  // Fallback: provider homepage via Google (I'm Feeling Lucky style)
  return `https://www.${provider.toLowerCase().replace(/\s+/g, '')}.it/`;
}
