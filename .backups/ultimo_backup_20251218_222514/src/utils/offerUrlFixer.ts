import { getOfferUrl } from './offerUrls';

/**
 * ALWAYS returns the simple, reliable provider URL.
 * Complex scraped URLs are often broken (e.g., Sorgenia infinite loading).
 * This ensures users ALWAYS land on a working page.
 */
export function fixOfferUrlCommodity(
  url: string | null | undefined,
  billType: 'luce' | 'gas' | 'combo',
  provider?: string,
  planName?: string
): string | null {
  // ALWAYS use the fallback URL - scraped URLs are unreliable
  if (provider) {
    const fallbackUrl = getOfferUrl(provider, planName || '');
    console.log('[URL FIX] Using reliable fallback URL:', fallbackUrl);
    return fallbackUrl;
  }
  
  // Last resort: return original URL
  return url || null;
}

/**
 * Pre-check is no longer needed since we always use reliable fallback URLs.
 */
export async function preCheckUrl(
  url: string | null | undefined,
  provider: string,
  planName: string
): Promise<string> {
  // Always return the reliable provider URL
  return getOfferUrl(provider, planName);
}
