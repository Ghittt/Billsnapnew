import { getOfferUrl } from './offerUrls';

/**
 * Fix commodity parameter in offer URLs to match user's bill type
 * AND validate/sanitize URLs to prevent broken redirects
 */
export function fixOfferUrlCommodity(
  url: string | null | undefined,
  billType: 'luce' | 'gas' | 'combo',
  provider?: string,
  planName?: string
): string | null {
  if (!url) {
    // If no URL provided, use fallback
    if (provider) {
      return getOfferUrl(provider, planName || '');
    }
    return null;
  }
  
  try {
    const urlObj = new URL(url);
    
    // VALIDATION: Check for suspicious patterns that often break
    const suspiciousPatterns = [
      'stepSimulazione=simulazioneSubscribe', // Sorgenia's broken parameter
      'contracteletype.html', // Old Sorgenia path
      '/residential/home.html?productType', // Complex Sorgenia path
    ];
    
    const urlString = urlObj.toString();
    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => urlString.includes(pattern));
    
    if (hasSuspiciousPattern) {
      console.warn('[URL VALIDATION] Suspicious pattern detected, using fallback');
      console.warn('[URL VALIDATION] Broken URL:', url);
      
      if (provider) {
        const fallbackUrl = getOfferUrl(provider, planName || '');
        console.log('[URL VALIDATION] Fallback URL:', fallbackUrl);
        return fallbackUrl;
      }
    }
    
    // FIX: commodity parameter to match bill type
    const currentCommodity = urlObj.searchParams.get('commodity');
    
    if (currentCommodity) {
      const correctCommodity = billType === 'luce' ? 'LUCE' : 
                               billType === 'gas' ? 'GAS' : 
                               'DUAL';
      
      urlObj.searchParams.set('commodity', correctCommodity);
      const fixedUrl = urlObj.toString();
      
      console.log(`[URL FIX] Changed commodity from ${currentCommodity} to ${correctCommodity}`);
      return fixedUrl;
    }
    
    return url;
  } catch (e) {
    console.error('[URL FIX] URL parsing error:', e);
    
    // Fallback to provider homepage if URL is broken
    if (provider) {
      return getOfferUrl(provider, planName || '');
    }
    
    return url; // Last resort: return original
  }
}
