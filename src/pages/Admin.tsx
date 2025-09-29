import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';

const Admin = () => {
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const [scrapingResult, setScrapingResult] = useState<any>(null);
  const { toast } = useToast();

  const handleScrapeOffers = async () => {
    setIsScrapingLoading(true);
    setScrapingResult(null);
    
    try {
      console.log('Starting scrape...');
      
      const { data, error } = await supabase.functions.invoke('scrape-offers', {
        body: {}
      });

      if (error) {
        console.error('Scraping error:', error);
        toast({
          title: "Errore durante lo scraping",
          description: error.message || "Si è verificato un errore durante l'aggiornamento delle offerte",
          variant: "destructive"
        });
        return;
      }

      console.log('Scraping result:', data);
      setScrapingResult(data);
      
      if (data.scraped_count > 0) {
        toast({
          title: "Scraping completato",
          description: `Aggiornate ${data.scraped_count} offerte con successo`,
        });
      } else {
        toast({
          title: "Nessuna offerta aggiornata",
          description: "Lo scraping non ha trovato nuove offerte valide",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error in scraping:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante lo scraping",
        variant: "destructive"
      });
    } finally {
      setIsScrapingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Pannello Amministratore</h1>
            <p className="text-muted-foreground">
              Gestisci le offerte energetiche e aggiorna i dati di mercato
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Aggiornamento Offerte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esegui lo scraping dei principali fornitori energetici per aggiornare 
                i prezzi e le condizioni delle offerte nel database.
              </p>
              
              <Button 
                onClick={handleScrapeOffers} 
                disabled={isScrapingLoading}
                className="w-full sm:w-auto"
              >
                {isScrapingLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aggiornamento in corso...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Aggiorna Offerte
                  </>
                )}
              </Button>

              {scrapingResult && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <div className="space-y-2">
                      <p><strong>Risultato scraping:</strong></p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Offerte trovate: {scrapingResult.scraped_count}</li>
                        <li>Offerte inserite: {scrapingResult.inserted_count}</li>
                        <li>Ultimo aggiornamento: {new Date(scrapingResult.updated_at).toLocaleString('it-IT')}</li>
                      </ul>
                      
                      {scrapingResult.offers && scrapingResult.offers.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm font-medium">Offerte aggiornate:</p>
                          <div className="mt-2 space-y-1">
                            {scrapingResult.offers.map((offer: any, index: number) => (
                              <div key={index} className="text-xs bg-muted p-2 rounded">
                                <strong>{offer.provider}</strong> - {offer.plan_name}: 
                                €{offer.unit_price_eur_kwh?.toFixed(4)}/kWh + 
                                €{offer.fixed_fee_eur_mo}/mese
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informazioni Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Fornitori monitorati:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                    <li>Enel Energia</li>
                    <li>Sorgenia</li>
                    <li>Edison Energia</li>
                    <li>Iren Luce e Gas</li>
                    <li>A2A Energia</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Frequenza aggiornamento:</p>
                  <p className="text-muted-foreground mt-1">
                    Manuale (consigliato: settimanale)
                  </p>
                  <p className="font-medium mt-3">Validità offerte:</p>
                  <p className="text-muted-foreground mt-1">
                    30 giorni dall'ultimo aggiornamento
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;