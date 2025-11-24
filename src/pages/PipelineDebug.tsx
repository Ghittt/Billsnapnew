import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Play, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PipelineStatus {
  uploadId: string;
  step1_ocr: { status: 'ok' | 'fail' | 'empty'; data?: any };
  step2_scraping: { status: 'ok' | 'fail' | 'empty'; count?: number };
  step3_comparison: { status: 'ok' | 'fail' | 'empty'; data?: any };
  step4_rendering: { status: 'ok' | 'fail' | 'empty'; reason?: string };
}

export default function PipelineDebug() {
  const [uploadId, setUploadId] = useState('');
  const [pipeline, setPipeline] = useState<PipelineStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('https://www.sorgenia.it/offerte-luce-e-gas');
  const [testingFirecrawl, setTestingFirecrawl] = useState(false);
  const [firecrawlResult, setFirecrawlResult] = useState<any>(null);
  const { toast } = useToast();

  const analyzeUpload = async (id: string) => {
    if (!id.trim()) {
      toast({
        title: "Upload ID richiesto",
        description: "Inserisci un Upload ID valido",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setPipeline(null);

    try {
      const status: PipelineStatus = {
        uploadId: id,
        step1_ocr: { status: 'empty' },
        step2_scraping: { status: 'empty' },
        step3_comparison: { status: 'empty' },
        step4_rendering: { status: 'empty' }
      };

      // STEP 1: Verifica OCR
      const { data: ocrData, error: ocrError } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('upload_id', id)
        .maybeSingle();

      if (ocrError) {
        status.step1_ocr = { status: 'fail', data: { error: ocrError.message } };
      } else if (!ocrData) {
        status.step1_ocr = { status: 'empty' };
      } else {
        // Verifica che i campi critici siano presenti
        const hasProvider = ocrData.provider && ocrData.provider !== null;
        const hasConsumption = (ocrData.annual_kwh && ocrData.annual_kwh > 0) || 
                              (ocrData.gas_smc && ocrData.gas_smc > 0);
        const hasPrice = (ocrData.unit_price_eur_kwh && ocrData.unit_price_eur_kwh > 0) ||
                        (ocrData.prezzo_gas_eur_smc && ocrData.prezzo_gas_eur_smc > 0);

        if (hasProvider && hasConsumption && hasPrice) {
          status.step1_ocr = { status: 'ok', data: ocrData };
        } else {
          status.step1_ocr = { 
            status: 'fail', 
            data: { 
              reason: 'Campi critici mancanti o null',
              hasProvider,
              hasConsumption,
              hasPrice,
              ocrData 
            }
          };
        }
      }

      // STEP 2: Verifica Scraping (offerte attive)
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true);

      if (offersError) {
        status.step2_scraping = { status: 'fail', count: 0 };
      } else if (!offersData || offersData.length === 0) {
        status.step2_scraping = { status: 'empty', count: 0 };
      } else {
        status.step2_scraping = { status: 'ok', count: offersData.length };
      }

      // STEP 3: Verifica Confronto
      const { data: comparisonData, error: comparisonError } = await supabase
        .from('comparison_results')
        .select('*')
        .eq('upload_id', id)
        .maybeSingle();

      if (comparisonError) {
        status.step3_comparison = { status: 'fail', data: { error: comparisonError.message } };
      } else if (!comparisonData) {
        status.step3_comparison = { status: 'empty' };
      } else {
        const hasOffers = comparisonData.ranked_offers && 
                         Array.isArray(comparisonData.ranked_offers) && 
                         comparisonData.ranked_offers.length > 0;
        
        if (hasOffers) {
          status.step3_comparison = { status: 'ok', data: comparisonData };
        } else {
          status.step3_comparison = { 
            status: 'fail', 
            data: { reason: 'Nessuna offerta rankata', comparisonData } 
          };
        }
      }

      // STEP 4: Verifica rendering (logica)
      if (status.step1_ocr.status !== 'ok') {
        status.step4_rendering = { 
          status: 'fail', 
          reason: 'OCR non ha prodotto dati validi' 
        };
      } else if (status.step2_scraping.status !== 'ok') {
        status.step4_rendering = { 
          status: 'fail', 
          reason: 'Nessuna offerta attiva nel database' 
        };
      } else if (status.step3_comparison.status !== 'ok') {
        status.step4_rendering = { 
          status: 'fail', 
          reason: 'Il confronto non ha prodotto offerte rankate' 
        };
      } else {
        status.step4_rendering = { status: 'ok' };
      }

      setPipeline(status);

      toast({
        title: "Analisi completata",
        description: `Pipeline analizzata per upload ${id.slice(0, 8)}...`
      });

    } catch (error) {
      console.error('Pipeline analysis error:', error);
      toast({
        title: "Errore analisi",
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testFirecrawl = async () => {
    if (!testUrl.trim()) {
      toast({
        title: "URL richiesto",
        description: "Inserisci un URL valido per testare Firecrawl",
        variant: "destructive"
      });
      return;
    }

    setTestingFirecrawl(true);
    setFirecrawlResult(null);

    try {
      toast({
        title: "Test Firecrawl avviato",
        description: "Sto testando Firecrawl con l'URL fornito..."
      });

      const { data, error } = await supabase.functions.invoke('scrape-single-offer', {
        body: { url: testUrl }
      });

      if (error) {
        setFirecrawlResult({ 
          success: false, 
          error: error.message,
          details: error 
        });
        toast({
          title: "Firecrawl fallito",
          description: error.message,
          variant: "destructive"
        });
      } else {
        setFirecrawlResult({ 
          success: true, 
          data,
          hasContent: data && (data.html || data.markdown || data.text)
        });
        toast({
          title: "Firecrawl completato",
          description: "Scraping eseguito con successo"
        });
      }
    } catch (error) {
      console.error('Firecrawl test error:', error);
      setFirecrawlResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Errore sconosciuto' 
      });
      toast({
        title: "Errore test Firecrawl",
        description: error instanceof Error ? error.message : 'Errore sconosciuto',
        variant: "destructive"
      });
    } finally {
      setTestingFirecrawl(false);
    }
  };

  const getStatusIcon = (status: 'ok' | 'fail' | 'empty') => {
    switch (status) {
      case 'ok':
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case 'fail':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'empty':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: 'ok' | 'fail' | 'empty') => {
    switch (status) {
      case 'ok':
        return <Badge variant="default">OK</Badge>;
      case 'fail':
        return <Badge variant="destructive">FAIL</Badge>;
      case 'empty':
        return <Badge variant="secondary">EMPTY</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Search className="h-8 w-8" />
            Debug Pipeline Completo
          </h1>
          <p className="text-muted-foreground mt-2">
            Analizza ogni step della pipeline: OCR → Scraping → Confronto → Rendering
          </p>
        </div>

        {/* Upload ID Analyzer */}
        <Card>
          <CardHeader>
            <CardTitle>1. Analizza Upload ID</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inserisci un Upload ID per verificare l'intera pipeline e identificare dove si interrompe.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="es. 1eda58e1-a132-4dc4-9ba2-145640eefb2b"
                value={uploadId}
                onChange={(e) => setUploadId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => analyzeUpload(uploadId)} disabled={loading}>
                <Search className={`h-4 w-4 mr-2 ${loading ? 'animate-pulse' : ''}`} />
                {loading ? 'Analisi...' : 'Analizza'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        {pipeline && (
          <Card>
            <CardHeader>
              <CardTitle>Stato Pipeline per: {pipeline.uploadId.slice(0, 20)}...</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* STEP 1: OCR */}
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(pipeline.step1_ocr.status)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Step 1: OCR Extraction</h3>
                    {getStatusBadge(pipeline.step1_ocr.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Verifica se l'OCR ha salvato dati su Supabase (provider, consumo, prezzo)
                  </p>
                  {pipeline.step1_ocr.status === 'ok' && pipeline.step1_ocr.data && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-green-500/10 p-3 rounded">
                      <div>
                        <span className="text-muted-foreground">Provider:</span>
                        <p className="font-semibold">{pipeline.step1_ocr.data.provider}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Consumo:</span>
                        <p className="font-semibold">
                          {pipeline.step1_ocr.data.annual_kwh ? `${pipeline.step1_ocr.data.annual_kwh} kWh` : 
                           pipeline.step1_ocr.data.gas_smc ? `${pipeline.step1_ocr.data.gas_smc} Smc` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Prezzo:</span>
                        <p className="font-semibold">
                          {pipeline.step1_ocr.data.unit_price_eur_kwh ? 
                            `${pipeline.step1_ocr.data.unit_price_eur_kwh.toFixed(3)} €/kWh` :
                           pipeline.step1_ocr.data.prezzo_gas_eur_smc ?
                            `${pipeline.step1_ocr.data.prezzo_gas_eur_smc.toFixed(3)} €/Smc` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Quality:</span>
                        <p className="font-semibold">
                          {pipeline.step1_ocr.data.quality_score ? 
                            `${(pipeline.step1_ocr.data.quality_score * 100).toFixed(0)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                  {pipeline.step1_ocr.status === 'fail' && (
                    <div className="bg-red-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-red-600">Problema identificato:</p>
                      <p>{pipeline.step1_ocr.data?.reason || 'OCR non ha prodotto dati validi'}</p>
                    </div>
                  )}
                  {pipeline.step1_ocr.status === 'empty' && (
                    <div className="bg-yellow-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-yellow-600">Nessun dato OCR trovato</p>
                      <p>Upload ID non ha record in ocr_results</p>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: Scraping */}
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(pipeline.step2_scraping.status)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Step 2: Firecrawl Scraping</h3>
                    {getStatusBadge(pipeline.step2_scraping.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Verifica se esistono offerte attive scrapate nel database
                  </p>
                  {pipeline.step2_scraping.status === 'ok' && (
                    <div className="bg-green-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-green-600">
                        {pipeline.step2_scraping.count} offerte attive trovate
                      </p>
                    </div>
                  )}
                  {pipeline.step2_scraping.status === 'empty' && (
                    <div className="bg-yellow-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-yellow-600">Nessuna offerta attiva</p>
                      <p>Firecrawl non ha prodotto offerte o sono tutte disattivate</p>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 3: Comparison */}
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(pipeline.step3_comparison.status)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Step 3: AI Comparison</h3>
                    {getStatusBadge(pipeline.step3_comparison.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Verifica se il confronto AI ha prodotto offerte rankate
                  </p>
                  {pipeline.step3_comparison.status === 'ok' && pipeline.step3_comparison.data && (
                    <div className="bg-green-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-green-600">
                        {Array.isArray(pipeline.step3_comparison.data.ranked_offers) ? 
                          pipeline.step3_comparison.data.ranked_offers.length : 0} offerte rankate
                      </p>
                      {pipeline.step3_comparison.data.best_offer_id && (
                        <p className="text-xs mt-1">
                          Best offer: {pipeline.step3_comparison.data.best_offer_id.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  )}
                  {pipeline.step3_comparison.status === 'fail' && (
                    <div className="bg-red-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-red-600">Confronto fallito</p>
                      <p>{pipeline.step3_comparison.data?.reason || 'Nessuna offerta prodotta dal confronto'}</p>
                    </div>
                  )}
                  {pipeline.step3_comparison.status === 'empty' && (
                    <div className="bg-yellow-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-yellow-600">Nessun risultato di confronto</p>
                      <p>comparison_results non contiene record per questo upload</p>
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 4: Rendering */}
              <div className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0">
                  {getStatusIcon(pipeline.step4_rendering.status)}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Step 4: UI Rendering</h3>
                    {getStatusBadge(pipeline.step4_rendering.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Verifica se i dati possono essere mostrati nell'interfaccia
                  </p>
                  {pipeline.step4_rendering.status === 'ok' && (
                    <div className="bg-green-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-green-600">Rendering OK</p>
                      <p>Tutti i dati necessari sono disponibili per la visualizzazione</p>
                    </div>
                  )}
                  {pipeline.step4_rendering.status === 'fail' && (
                    <div className="bg-red-500/10 p-3 rounded text-sm">
                      <p className="font-semibold text-red-600">Rendering bloccato</p>
                      <p>{pipeline.step4_rendering.reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Firecrawl Test */}
        <Card>
          <CardHeader>
            <CardTitle>2. Test Firecrawl Manuale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Testa Firecrawl con un URL specifico per verificare se lo scraping funziona
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://www.provider.it/offerte"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                className="flex-1"
              />
              <Button onClick={testFirecrawl} disabled={testingFirecrawl}>
                <Play className={`h-4 w-4 mr-2 ${testingFirecrawl ? 'animate-pulse' : ''}`} />
                {testingFirecrawl ? 'Testing...' : 'Test'}
              </Button>
            </div>

            {firecrawlResult && (
              <div className={`p-4 rounded-lg ${
                firecrawlResult.success ? 'bg-green-500/10' : 'bg-red-500/10'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {firecrawlResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <p className="font-semibold">
                    {firecrawlResult.success ? 'Firecrawl funziona' : 'Firecrawl fallito'}
                  </p>
                </div>
                {firecrawlResult.success ? (
                  <div className="text-sm space-y-2">
                    <p>✅ Scraping completato con successo</p>
                    <p>Contenuto trovato: {firecrawlResult.hasContent ? 'Sì' : 'No'}</p>
                    <details>
                      <summary className="cursor-pointer text-primary hover:underline">
                        Vedi risposta Firecrawl
                      </summary>
                      <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto max-h-60">
                        {JSON.stringify(firecrawlResult.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ) : (
                  <div className="text-sm">
                    <p className="text-red-600">{firecrawlResult.error}</p>
                    {firecrawlResult.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-primary hover:underline">
                          Vedi dettagli errore
                        </summary>
                        <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto">
                          {JSON.stringify(firecrawlResult.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Troubleshooting Tips */}
        <Card>
          <CardHeader>
            <CardTitle>💡 Guida Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-semibold">Se Step 1 (OCR) è EMPTY o FAIL:</p>
              <p className="text-muted-foreground">
                → Problema OCR o mapping Lovable → Supabase. Controlla edge function ocr-extract e logs.
              </p>
            </div>
            <div>
              <p className="font-semibold">Se Step 2 (Scraping) è EMPTY:</p>
              <p className="text-muted-foreground">
                → Firecrawl non ha offerte attive. Usa "Test Firecrawl Manuale" per verificare configurazione.
              </p>
            </div>
            <div>
              <p className="font-semibold">Se Step 3 (Confronto) è FAIL:</p>
              <p className="text-muted-foreground">
                → Edge function compare-offers non produce ranked_offers. Controlla logica di filtro e parsing.
              </p>
            </div>
            <div>
              <p className="font-semibold">Se Step 4 (Rendering) è FAIL:</p>
              <p className="text-muted-foreground">
                → UI ha condizioni rotte o stati non aggiornati. Controlla Results.tsx e Upload.tsx.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
