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
    
    // VALIDATION: Check for suspicious patterns that often break    // VALIDATION: Check for suspicious patterns that often break
    const suspiciousPatterns = [
      // 'stepSimulazione=simulazioneSubscribe', // removed as it's a valid parameter
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

/**
 * Perform a lightweight pre‑check to see if the URL is reachable.
 * Returns the original URL if the request succeeds (status 200‑299),
 * otherwise returns the fallback URL (provider homepage) generated via getOfferUrl.
 */
export async function preCheckUrl(
  url: string | null | undefined,
  provider: string,
  planName: string
): Promise<string> {
  if (!url) return getOfferUrl(provider, planName);
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    if (response.ok) return url;
    console.warn('[URL PRE‑CHECK] Unreachable URL, falling back to provider homepage', url);
    return getOfferUrl(provider, planName);
  } catch (e) {
    console.error('[URL PRE‑CHECK] Error checking URL', e);
    return getOfferUrl(provider, planName);
  }
}
