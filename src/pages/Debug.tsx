import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const Debug = () => {
  const { toast } = useToast();
  const [openaiStatus, setOpenaiStatus] = useState<any>(null);
  const [offersStatus, setOffersStatus] = useState<any>(null);
  const [loading, setLoading] = useState({ openai: false, offers: false, scrape: false });

  const testOpenAI = async () => {
    setLoading({ ...loading, openai: true });
    try {
      // Test through a simple edge function that uses OpenAI
      const { data, error } = await supabase.functions.invoke('ai-generate-copy', {
        body: { test: true, prompt: 'Say "OK OpenAI" if you can hear me' }
      });
      
      if (error) throw error;
      setOpenaiStatus({ success: true, data });
      toast({ title: 'OpenAI OK', description: 'OpenAI API key is working' });
    } catch (error) {
      console.error('OpenAI test failed:', error);
      setOpenaiStatus({ success: false, error: String(error) });
      toast({ title: 'OpenAI Failed', description: String(error), variant: 'destructive' });
    } finally {
      setLoading({ ...loading, openai: false });
    }
  };

  const testOffers = async () => {
    setLoading({ ...loading, offers: true });
    try {
      const { data, error } = await supabase.functions.invoke('get-best-offer', {
        body: { commodity: 'power', annual_kwh: 2700, annual_smc: 0 }
      });

      if (error) throw error;
      
      const hasOffers = data?.best_offer && data?.offers?.length >= 3;
      setOffersStatus({ 
        success: hasOffers, 
        data,
        offerCount: data?.offers?.length || 0
      });
      
      if (hasOffers) {
        toast({ title: 'Offers OK', description: `Found ${data.offers.length} offers` });
      } else {
        toast({ title: 'No Offers', description: 'Try running scraper', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Offers test failed:', error);
      setOffersStatus({ success: false, error: String(error) });
      toast({ title: 'Offers Failed', description: String(error), variant: 'destructive' });
    } finally {
      setLoading({ ...loading, offers: false });
    }
  };

  const runScraper = async () => {
    setLoading({ ...loading, scrape: true });
    try {
      const { data, error } = await supabase.functions.invoke('scrape-offers');
      
      if (error) throw error;
      toast({ 
        title: 'Scraper Complete', 
        description: `Scraped ${data?.scraped_count || 0} offers` 
      });
      
      // Auto-retest offers after scraping
      setTimeout(() => testOffers(), 1000);
    } catch (error) {
      console.error('Scraper failed:', error);
      toast({ title: 'Scraper Failed', description: String(error), variant: 'destructive' });
    } finally {
      setLoading({ ...loading, scrape: false });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold">BillSnap Debug Console</h1>
        
        {/* OpenAI Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {openaiStatus?.success === true && <CheckCircle className="w-5 h-5 text-green-500" />}
              {openaiStatus?.success === false && <XCircle className="w-5 h-5 text-red-500" />}
              OpenAI API Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testOpenAI} 
              disabled={loading.openai}
              className="w-full"
            >
              {loading.openai && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Test OpenAI Key
            </Button>
            {openaiStatus && (
              <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(openaiStatus, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        {/* Offers Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {offersStatus?.success === true && <CheckCircle className="w-5 h-5 text-green-500" />}
              {offersStatus?.success === false && <XCircle className="w-5 h-5 text-red-500" />}
              Offers API Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={testOffers} 
                disabled={loading.offers}
                className="flex-1"
              >
                {loading.offers && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Test Get Best Offer
              </Button>
              <Button 
                onClick={runScraper} 
                disabled={loading.scrape}
                variant="outline"
                className="flex-1"
              >
                {loading.scrape && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Run Scraper
              </Button>
            </div>
            {offersStatus && (
              <div className="space-y-2">
                <p className="text-sm">
                  Offers found: <strong>{offersStatus.offerCount || 0}</strong>
                </p>
                <pre className="bg-muted p-4 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(offersStatus.data, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card>
          <CardHeader>
            <CardTitle>What Uses What?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>OpenAI is used in:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>ocr-extract: Parsing bill data from PDF/image</li>
              <li>ai-parse-bill: Normalizing extracted data</li>
              <li>ai-generate-copy: Creating marketing copy</li>
            </ul>
            <p className="mt-4"><strong>Offers API:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>get-best-offer: Fetches best offer from DB</li>
              <li>scrape-offers: Populates offers table from energy provider websites</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Debug;
