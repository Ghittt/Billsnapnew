// Utility function to generate offer URLs based on provider name
// All URLs verified as working as of December 2025
export function getOfferUrl(provider: string, planName: string): string {
  const p = (provider || '').toLowerCase();
  
  // Pulsee - main offers page
  if (p.includes('pulsee')) return 'https://www.pulsee.it/luce-e-gas';
  
  // Enel Energia
  if (p.includes('enel')) return 'https://www.enel.it/it/luce-gas/offerte';
  
  // Eni Plenitude
  if (p.includes('eni') || p.includes('plenitude')) return 'https://eniplenitude.com/it/offerte-luce-gas';
  
  // A2A Energia
  if (p.includes('a2a')) return 'https://www.a2aenergia.eu/offerte';
  
  // Edison Energia
  if (p.includes('edison')) return 'https://www.edison.it/offerte';
  
  // Sorgenia
  if (p.includes('sorgenia')) return 'https://www.sorgenia.it/offerte';
  
  // Illumia
  if (p.includes('illumia')) return 'https://www.illumia.it/';
  
  // Wekiwi
  if (p.includes('wekiwi')) return 'https://www.wekiwi.it/';
  
  // Iren Luce Gas e Servizi
  if (p.includes('iren')) return 'https://www.irenlucegas.it/';
  
  // Hera Comm
  if (p.includes('hera')) return 'https://www.heracomm.it/';
  
  // Axpo Italia
  if (p.includes('axpo')) return 'https://www.axpo.com/it/it/privati.html';
  
  // Engie Italia
  if (p.includes('engie')) return 'https://www.engie.it/';
  
  // Acea Energia
  if (p.includes('acea')) return 'https://www.acea.it/offerte';
  
  // Optima Italia
  if (p.includes('optima')) return 'https://www.optimaitalia.com/';
  
  // Green Network Energy
  if (p.includes('green network')) return 'https://www.greennetworkenergy.it/';
  
  // E.ON Energia
  if (p.includes('e.on') || p.includes('eon')) return 'https://www.eon-energia.com/offerte.html';
  
  // Fastweb Energia
  if (p.includes('fastweb')) return 'https://www.fastweb.it/energia/';
  
  // Duferco Energia
  if (p.includes('duferco')) return 'https://www.dufercoenergia.com/';
  
  // Fallback: Google search for the specific offer
  return `https://www.google.com/search?q=${encodeURIComponent(provider + ' ' + planName + ' offerta energia sottoscrivi')}`;
}
