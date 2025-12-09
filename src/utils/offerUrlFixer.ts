/**
 * Fix commodity parameter in offer URLs to match user's bill type
 * This prevents users landing on wrong activation pages (e.g., DUAL when they need LUCE only)
 */
export function fixOfferUrlCommodity(
  url: string | null | undefined,
  billType: 'luce' | 'gas' | 'combo'
): string | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const currentCommodity = urlObj.searchParams.get('commodity');
    
    if (currentCommodity) {
      // Map billType to correct commodity parameter
      const correctCommodity = billType === 'luce' ? 'LUCE' : 
                               billType === 'gas' ? 'GAS' : 
                               'DUAL';
      
      urlObj.searchParams.set('commodity', correctCommodity);
      const fixedUrl = urlObj.toString();
      
      console.log(`[URL FIX] Changed commodity from ${currentCommodity} to ${correctCommodity}`);
      console.log(`[URL FIX] Original: ${url}`);
      console.log(`[URL FIX] Fixed: ${fixedUrl}`);
      
      return fixedUrl;
    }
    
    return url;
  } catch (e) {
    console.error('[URL FIX] URL parsing error:', e);
    return url; // Fallback to original URL
  }
}
