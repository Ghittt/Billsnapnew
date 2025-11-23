import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import Header from '@/components/layout/Header';

export default function ScrapingTest() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleScrape = async () => {
    if (!url) {
      toast({
        title: 'Errore',
        description: 'Inserisci un URL valido',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-single-offer', {
        body: { url }
      });

      if (error) {
        throw error;
      }

      setResult(data);
      
      if (data.success) {
        toast({
          title: 'Scraping completato',
          description: `${data.offers_found} offerte trovate, ${data.offers_saved} salvate in Supabase`,
        });
      } else {
        toast({
          title: 'Attenzione',
          description: data.error || 'Nessuna offerta trovata',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Scraping error:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante lo scraping',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testUrls = [
    { label: 'Edison Energia (homepage)', url: 'https://www.edisonenergia.it/it' },
    { label: 'Enel Energia', url: 'https://www.enel.it/it/offerte-luce' },
    { label: 'ENI Plenitude', url: 'https://www.eniplenitude.com/it/casa/offerte-luce-gas' },
    { label: 'A2A Energia', url: 'https://www.a2aenergia.eu/casa/offerte' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Test Scraping Offerte Energia</h1>
          <p className="text-muted-foreground">
            Testa l'integrazione Firecrawl + Gemini per estrarre e normalizzare offerte energetiche
          </p>
        </div>

        <Card className="p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">URL Provider Energia</label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  placeholder="https://www.provider.it/offerte-luce"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleScrape} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scraping...
                    </>
                  ) : (
                    'Avvia Scraping'
                  )}
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">URL di test rapidi:</p>
              <div className="flex flex-wrap gap-2">
                {testUrls.map((test) => (
                  <Button
                    key={test.url}
                    variant="outline"
                    size="sm"
                    onClick={() => setUrl(test.url)}
                    disabled={loading}
                  >
                    {test.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {result && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Risultati Scraping</h2>
            
            {result.success ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">URL Analizzato</p>
                    <p className="font-medium truncate">{result.url}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Offerte Trovate</p>
                    <p className="font-medium">{result.offers_found}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Offerte Salvate</p>
                    <p className="font-medium">{result.offers_saved}</p>
                  </div>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground">Stato</p>
                    <p className="font-medium text-green-600">✓ Successo</p>
                  </div>
                </div>

                {result.normalized_data?.offerte && result.normalized_data.offerte.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Offerte Estratte</h3>
                    <div className="space-y-3">
                      {result.normalized_data.offerte.map((offer: any, index: number) => (
                        <Card key={index} className="p-4 bg-accent/20">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <p className="text-muted-foreground">Nome Offerta</p>
                              <p className="font-medium">{offer.nome_offerta || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Provider</p>
                              <p className="font-medium">{offer.provider || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Commodity</p>
                              <p className="font-medium">{offer.commodity || '-'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Prezzo</p>
                              <p className="font-medium">
                                {offer.prezzo_kwh ? `€${offer.prezzo_kwh}/kWh` : 
                                 offer.prezzo_smc ? `€${offer.prezzo_smc}/Smc` : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Quota Fissa</p>
                              <p className="font-medium">
                                {offer.quota_fissa_mensile ? `€${offer.quota_fissa_mensile}/mese` : '-'}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Tipo</p>
                              <p className="font-medium">{offer.tipo_prezzo || '-'}</p>
                            </div>
                            {offer.note_commerciali && (
                              <div className="col-span-2 md:col-span-3">
                                <p className="text-muted-foreground">Note</p>
                                <p className="text-sm">{offer.note_commerciali}</p>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <details className="mt-6">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Mostra JSON completo
                  </summary>
                  <pre className="mt-3 p-4 bg-secondary rounded-lg text-xs overflow-auto max-h-96">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-destructive font-medium">Errore durante lo scraping</p>
                <p className="text-sm mt-2">{result.error || 'Errore sconosciuto'}</p>
                {result.details && (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-muted-foreground">Dettagli errore</summary>
                    <pre className="mt-2 text-xs overflow-auto">{result.details}</pre>
                  </details>
                )}
              </div>
            )}
          </Card>
        )}

        <Card className="p-6 mt-6 bg-accent/20">
          <h3 className="font-semibold mb-2">Come funziona</h3>
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>Firecrawl estrae il contenuto HTML/Markdown dalla pagina</li>
            <li>Gemini analizza il contenuto e identifica le offerte energia</li>
            <li>I dati vengono normalizzati in formato JSON strutturato</li>
            <li>Le offerte vengono salvate in Supabase (tabella offers_scraped)</li>
            <li>I risultati vengono mostrati in questa interfaccia</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
