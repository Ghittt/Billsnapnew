import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, RefreshCw, Activity, CheckCircle, XCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();
  const [isScrapingLoading, setIsScrapingLoading] = useState(false);
  const [isHealthCheckLoading, setIsHealthCheckLoading] = useState(false);
  const [isQALoading, setIsQALoading] = useState(false);
  const [scrapingResult, setScrapingResult] = useState<any>(null);
  const [healthCheckResult, setHealthCheckResult] = useState<any>(null);
  const [qaResult, setQaResult] = useState<any>(null);
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

  const handleHealthCheck = async () => {
    setIsHealthCheckLoading(true);
    setHealthCheckResult(null);
    
    try {
      console.log('Starting health check...');
      
      const { data, error } = await supabase.functions.invoke('health-check', {
        body: {}
      });

      if (error) {
        console.error('Health check error:', error);
        toast({
          title: "Errore durante il health check",
          description: error.message || "Si è verificato un errore durante il controllo del sistema",
          variant: "destructive"
        });
        return;
      }

      console.log('Health check result:', data);
      setHealthCheckResult(data);
      
      if (data.status === 'PASS') {
        toast({
          title: "Sistema operativo",
          description: `Tutti i test sono passati (${data.summary?.tests_passed}/${data.summary?.tests_total})`,
        });
      } else {
        toast({
          title: "Problemi rilevati",
          description: `${data.summary?.tests_passed || 0}/${data.summary?.tests_total || 0} test passati`,
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error in health check:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il health check",
        variant: "destructive"
      });
    } finally {
      setIsHealthCheckLoading(false);
    }
  };

  const handleQACheckLinks = async () => {
    setIsQALoading(true);
    setQaResult(null);
    
    try {
      console.log('Starting QA check for offer links...');
      
      const { data, error } = await supabase.functions.invoke('qa-check-offer-links', {
        body: { limit: 200, force_check: false }
      });

      if (error) {
        console.error('QA check error:', error);
        toast({
          title: "Errore durante il QA",
          description: error.message || "Si è verificato un errore durante il controllo dei link",
          variant: "destructive"
        });
        return;
      }

      console.log('QA check result:', data);
      setQaResult(data);
      
      if (data.success && data.summary) {
        const { ok, failed, total_checked } = data.summary;
        const successRate = total_checked > 0 ? Math.round((ok / total_checked) * 100) : 0;
        
        toast({
          title: "QA Completato",
          description: `${ok}/${total_checked} link verificati (${successRate}%). ${failed} falliti.`,
          variant: failed > 0 ? "destructive" : "default"
        });
      }

    } catch (error) {
      console.error('Error in QA check:', error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il QA dei link",
        variant: "destructive"
      });
    } finally {
      setIsQALoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-center space-y-2 flex-1">
              <h1 className="text-3xl font-bold">Pannello Amministratore</h1>
              <p className="text-muted-foreground">
                Gestisci le offerte energetiche e aggiorna i dati di mercato
              </p>
            </div>
            <Button onClick={() => navigate('/admin/offers')} variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Gestisci Offerte
            </Button>
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
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Health Check Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Esegui un controllo completo dello stato del sistema: scraping, database e API delle offerte.
              </p>
              
              <Button 
                onClick={handleHealthCheck} 
                disabled={isHealthCheckLoading}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isHealthCheckLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Controllo in corso...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Esegui Health Check
                  </>
                )}
              </Button>

              {healthCheckResult && (
                <Alert className={`mt-4 ${healthCheckResult.status === 'PASS' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {healthCheckResult.status === 'PASS' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          Status: {healthCheckResult.status} 
                          ({healthCheckResult.summary?.tests_passed}/{healthCheckResult.summary?.tests_total} test passati)
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Scraper Test */}
                          <div className="bg-muted p-2 rounded">
                            <div className="flex items-center gap-1 mb-1">
                              {healthCheckResult.tests?.scraper_test?.status === 'PASS' ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-600" />
                              )}
                              <span className="font-medium text-xs">Scraper</span>
                            </div>
                            <p className="text-xs">
                              Offerte: {healthCheckResult.tests?.scraper_test?.offers_count || 0}
                            </p>
                            <p className="text-xs">
                              Tempo: {healthCheckResult.tests?.scraper_test?.duration_ms || 0}ms
                            </p>
                            {healthCheckResult.tests?.scraper_test?.error && (
                              <p className="text-xs text-red-600 mt-1">
                                {healthCheckResult.tests.scraper_test.error}
                              </p>
                            )}
                          </div>
                          
                          {/* Database Test */}
                          <div className="bg-muted p-2 rounded">
                            <div className="flex items-center gap-1 mb-1">
                              {healthCheckResult.tests?.database_test?.status === 'PASS' ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-600" />
                              )}
                              <span className="font-medium text-xs">Database</span>
                            </div>
                            <p className="text-xs">
                              Offerte attive: {healthCheckResult.tests?.database_test?.active_offers_count || 0}
                            </p>
                            {healthCheckResult.tests?.database_test?.error && (
                              <p className="text-xs text-red-600 mt-1">
                                {healthCheckResult.tests.database_test.error}
                              </p>
                            )}
                          </div>
                          
                          {/* Best Offer Test */}
                          <div className="bg-muted p-2 rounded">
                            <div className="flex items-center gap-1 mb-1">
                              {healthCheckResult.tests?.best_offer_test?.status === 'PASS' ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-600" />
                              )}
                              <span className="font-medium text-xs">Best Offer</span>
                            </div>
                            {healthCheckResult.tests?.best_offer_test?.provider && (
                              <>
                                <p className="text-xs">
                                  Provider: {healthCheckResult.tests.best_offer_test.provider}
                                </p>
                                <p className="text-xs">
                                  Prezzo: €{healthCheckResult.tests.best_offer_test.price_kwh?.toFixed(4)}/kWh
                                </p>
                              </>
                            )}
                            <p className="text-xs">
                              Tempo: {healthCheckResult.tests?.best_offer_test?.duration_ms || 0}ms
                            </p>
                            {healthCheckResult.tests?.best_offer_test?.error && (
                              <p className="text-xs text-red-600 mt-1">
                                {healthCheckResult.tests.best_offer_test.error}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        {healthCheckResult.kpis && (
                          <div className="mt-3 p-2 bg-background rounded border">
                            <p className="text-xs font-medium mb-1">KPI Correnti:</p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <p>Offerte totali: {healthCheckResult.kpis.num_offers}</p>
                              <p>Miglior provider: {healthCheckResult.kpis.best_provider || 'N/A'}</p>
                              <p>Miglior prezzo: €{healthCheckResult.kpis.best_price_kwh?.toFixed(4) || 'N/A'}/kWh</p>
                              <p>Costo annuo: €{healthCheckResult.kpis.best_annual_cost || 'N/A'}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Ultimo aggiornamento: {new Date(healthCheckResult.timestamp).toLocaleString('it-IT')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                QA Link Offerte
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Verifica automaticamente tutti i link delle offerte per assicurarsi che siano accessibili e validi.
              </p>
              
              <Button 
                onClick={handleQACheckLinks} 
                disabled={isQALoading}
                variant="outline"
                className="w-full sm:w-auto"
              >
                {isQALoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Controllo in corso...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Verifica Link
                  </>
                )}
              </Button>

              {qaResult && qaResult.success && (
                <Alert className="mt-4">
                  <AlertDescription>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Risultati QA: {qaResult.summary.ok}/{qaResult.summary.total_checked} link OK
                        </span>
                      </div>
                      
                      {qaResult.results && qaResult.results.length > 0 && (
                        <div className="space-y-2 text-sm max-h-64 overflow-y-auto">
                          {qaResult.results.filter((r: any) => !r.ok).map((result: any, index: number) => (
                            <div key={index} className="bg-destructive/10 p-2 rounded text-xs">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-medium">{result.provider}</p>
                                  <p className="text-muted-foreground truncate">{result.url}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-destructive">
                                    {result.status > 0 ? `HTTP ${result.status}` : result.error}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {qaResult.summary.ok > 0 && (
                            <p className="text-xs text-success text-center pt-2">
                              ✓ {qaResult.summary.ok} link verificati con successo
                            </p>
                          )}
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
                  
                  <p className="font-medium mt-3">Acceptance Criteria:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground text-xs">
                    <li>≥3 offerte scraped</li>
                    <li>Prezzo: 0.10-0.80 €/kWh</li>
                    <li>Costo annuo: 100-5000 €</li>
                    <li>Response time {'<'} 500ms</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Frequenza controlli:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-muted-foreground">
                    <li>Scraping: Manuale/Daily cron</li>
                    <li>Health check: On-demand</li>
                    <li>Validità offerte: 30 giorni</li>
                  </ul>
                  
                  <p className="font-medium mt-3">API Test Commands:</p>
                  <div className="mt-1 space-y-1 text-xs font-mono bg-muted p-2 rounded">
                    <p>POST /functions/v1/scrape-offers</p>
                    <p>GET /functions/v1/get-best-offer?annual_kwh=2700</p>
                    <p>POST /functions/v1/health-check</p>
                  </div>
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