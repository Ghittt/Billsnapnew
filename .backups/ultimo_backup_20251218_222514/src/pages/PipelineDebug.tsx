import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Play, Search, Database, FileText, Globe, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BillRecord {
  id: string;
  upload_id: string;
  created_at: string;
  file_type: string;
  provider: string | null;
  annual_kwh: number | null;
  unit_price_eur_kwh: number | null;
  pipelineStatus: 'OCR_OK' | 'OCR_MANCANTE' | 'OFFERTE_TROVATE' | 'NESSUNA_OFFERTA' | 'SCRAPING_KO';
}

interface DebugData {
  ocr: {
    status: 'ok' | 'fail' | 'empty';
    data: any;
    raw_response: any;
  };
  supabase: {
    status: 'ok' | 'fail';
    table: string;
    record: any;
  };
  firecrawl: {
    status: 'ok' | 'fail' | 'empty';
    url?: string;
    response?: any;
  };
  parsing: {
    status: 'ok' | 'fail' | 'empty';
    raw_offers: any[];
    filtered_offers: any[];
    max_saving: number;
    min_threshold: number;
    reason?: string;
  };
  logs: Array<{
    timestamp: string;
    step: string;
    message: string;
  }>;
}

export default function PipelineDebug() {
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillRecord | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testUrl, setTestUrl] = useState('https://www.sorgenia.it/offerte-luce-e-gas');
  const [testingFirecrawl, setTestingFirecrawl] = useState(false);
  const [firecrawlTestResult, setFirecrawlTestResult] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadBillsList();
  }, []);

  const loadBillsList = async () => {
    setLoading(true);
    try {
      const { data: uploads, error: uploadsError } = await supabase
        .from('uploads')
        .select('id, file_type, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (uploadsError) throw uploadsError;

      const billRecords: BillRecord[] = [];
      
      for (const upload of uploads || []) {
        const { data: ocrData } = await supabase
          .from('ocr_results')
          .select('*')
          .eq('upload_id', upload.id)
          .maybeSingle();

        const { data: comparisonData } = await supabase
          .from('comparison_results')
          .select('ranked_offers')
          .eq('upload_id', upload.id)
          .maybeSingle();

        const { data: offersData } = await supabase
          .from('offers')
          .select('id')
          .eq('is_active', true)
          .limit(1);

        let pipelineStatus: BillRecord['pipelineStatus'] = 'OCR_MANCANTE';
        
        if (ocrData && ocrData.provider && (ocrData.annual_kwh || ocrData.gas_smc) && (ocrData.unit_price_eur_kwh || ocrData.prezzo_gas_eur_smc)) {
          pipelineStatus = 'OCR_OK';
          
          if (!offersData || offersData.length === 0) {
            pipelineStatus = 'SCRAPING_KO';
          } else if (comparisonData && Array.isArray(comparisonData.ranked_offers) && comparisonData.ranked_offers.length > 0) {
            pipelineStatus = 'OFFERTE_TROVATE';
          } else if (comparisonData) {
            pipelineStatus = 'NESSUNA_OFFERTA';
          }
        }

        billRecords.push({
          id: upload.id,
          upload_id: upload.id,
          created_at: upload.created_at,
          file_type: upload.file_type,
          provider: ocrData?.provider || null,
          annual_kwh: ocrData?.annual_kwh || null,
          unit_price_eur_kwh: ocrData?.unit_price_eur_kwh || null,
          pipelineStatus
        });
      }

      setBills(billRecords);
    } catch (error) {
      console.error('Error loading bills:', error);
      toast({
        title: "Errore caricamento",
        description: "Impossibile caricare la lista bollette",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeUpload = async (bill: BillRecord) => {
    setSelectedBill(bill);
    setLoading(true);
    setDebugData(null);

    const logs: DebugData['logs'] = [];
    const addLog = (step: string, message: string) => {
      logs.push({
        timestamp: new Date().toISOString(),
        step,
        message
      });
    };

    try {
      const debugInfo: DebugData = {
        ocr: { status: 'empty', data: null, raw_response: null },
        supabase: { status: 'fail', table: 'ocr_results', record: null },
        firecrawl: { status: 'empty' },
        parsing: { 
          status: 'empty', 
          raw_offers: [], 
          filtered_offers: [], 
          max_saving: 0, 
          min_threshold: 50 
        },
        logs: []
      };

      // BLOCCO 1: OCR
      addLog('OCR', 'Inizio analisi OCR');
      const { data: ocrData, error: ocrError } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('upload_id', bill.upload_id)
        .maybeSingle();

      const { data: ocrDebugData } = await supabase
        .from('ocr_debug')
        .select('*')
        .eq('upload_id', bill.upload_id)
        .maybeSingle();

      if (ocrError) {
        debugInfo.ocr.status = 'fail';
        addLog('OCR', `Errore: ${ocrError.message}`);
      } else if (!ocrData) {
        debugInfo.ocr.status = 'empty';
        addLog('OCR', 'Nessun dato OCR trovato');
      } else {
        const hasProvider = ocrData.provider && ocrData.provider !== null;
        const hasConsumption = (ocrData.annual_kwh && ocrData.annual_kwh > 0) || 
                              (ocrData.gas_smc && ocrData.gas_smc > 0);
        const hasPrice = (ocrData.unit_price_eur_kwh && ocrData.unit_price_eur_kwh > 0) ||
                        (ocrData.prezzo_gas_eur_smc && ocrData.prezzo_gas_eur_smc > 0);

        debugInfo.ocr.status = (hasProvider && hasConsumption && hasPrice) ? 'ok' : 'fail';
        debugInfo.ocr.data = ocrData;
        debugInfo.ocr.raw_response = ocrDebugData?.raw_json || ocrData.raw_json;
        addLog('OCR', debugInfo.ocr.status === 'ok' ? 'OCR completato con successo' : 'OCR incompleto - campi mancanti');
      }

      // BLOCCO 2: Supabase
      addLog('Supabase', 'Verifica record Supabase');
      if (ocrData) {
        debugInfo.supabase.status = 'ok';
        debugInfo.supabase.record = ocrData;
        addLog('Supabase', 'Record trovato e salvato correttamente');
      } else {
        debugInfo.supabase.status = 'fail';
        addLog('Supabase', 'NESSUN RECORD SUPABASE TROVATO PER QUESTA BOLLETTA');
      }

      // BLOCCO 3: Firecrawl
      addLog('Firecrawl', 'Verifica offerte scrapate');
      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true);

      if (offersError) {
        debugInfo.firecrawl.status = 'fail';
        addLog('Firecrawl', `Errore: ${offersError.message}`);
      } else if (!offersData || offersData.length === 0) {
        debugInfo.firecrawl.status = 'empty';
        addLog('Firecrawl', 'Nessuna offerta attiva trovata');
      } else {
        debugInfo.firecrawl.status = 'ok';
        debugInfo.firecrawl.response = { count: offersData.length, sample: offersData.slice(0, 3) };
        addLog('Firecrawl', `${offersData.length} offerte attive trovate`);
      }

      // BLOCCO 4: Parsing & Offerte
      addLog('Parsing', 'Inizio analisi parsing e offerte');
      const { data: comparisonData, error: comparisonError } = await supabase
        .from('comparison_results')
        .select('*')
        .eq('upload_id', bill.upload_id)
        .maybeSingle();

      if (comparisonError) {
        debugInfo.parsing.status = 'fail';
        debugInfo.parsing.reason = `Errore: ${comparisonError.message}`;
        addLog('Parsing', `Errore: ${comparisonError.message}`);
      } else if (!comparisonData) {
        debugInfo.parsing.status = 'empty';
        debugInfo.parsing.reason = 'Nessun risultato di confronto trovato';
        addLog('Parsing', 'Nessun risultato di confronto trovato');
      } else {
        const rankedOffers = Array.isArray(comparisonData.ranked_offers) ? comparisonData.ranked_offers : [];
        
        debugInfo.parsing.raw_offers = offersData || [];
        debugInfo.parsing.filtered_offers = rankedOffers;
        
        if (rankedOffers.length > 0) {
          const savings = rankedOffers.map((o: any) => o.annual_saving_eur || 0);
          debugInfo.parsing.max_saving = Math.max(...savings);
          debugInfo.parsing.status = 'ok';
          addLog('Parsing', `${rankedOffers.length} offerte rankate - Risparmio max: €${debugInfo.parsing.max_saving.toFixed(2)}`);
        } else {
          debugInfo.parsing.status = 'fail';
          if (debugInfo.parsing.raw_offers.length > 0) {
            debugInfo.parsing.reason = 'NESSUNA OFFERTA DOPO I FILTRI';
            addLog('Parsing', 'NESSUNA OFFERTA DOPO I FILTRI');
          } else {
            debugInfo.parsing.reason = 'NESSUNA OFFERTA DAL PARSER';
            addLog('Parsing', 'NESSUNA OFFERTA DAL PARSER');
          }
        }
      }

      debugInfo.logs = logs;
      setDebugData(debugInfo);

      toast({
        title: "Analisi completata",
        description: `Debug completato per bolletta ${bill.id.slice(0, 8)}...`
      });

    } catch (error) {
      console.error('Debug analysis error:', error);
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
        description: "Inserisci un URL valido",
        variant: "destructive"
      });
      return;
    }

    setTestingFirecrawl(true);
    setFirecrawlTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-single-offer', {
        body: { url: testUrl }
      });

      if (error) {
        setFirecrawlTestResult({ success: false, error: error.message });
        toast({ title: "Test fallito", description: error.message, variant: "destructive" });
      } else {
        setFirecrawlTestResult({ success: true, data });
        toast({ title: "Test completato", description: "Firecrawl funziona correttamente" });
      }
    } catch (error) {
      setFirecrawlTestResult({ success: false, error: error instanceof Error ? error.message : 'Errore' });
      toast({ title: "Errore", description: "Test Firecrawl fallito", variant: "destructive" });
    } finally {
      setTestingFirecrawl(false);
    }
  };

  const getStatusBadgeVariant = (status: BillRecord['pipelineStatus']) => {
    switch (status) {
      case 'OFFERTE_TROVATE': return 'default';
      case 'OCR_OK': return 'secondary';
      case 'OCR_MANCANTE': return 'destructive';
      case 'SCRAPING_KO': return 'destructive';
      case 'NESSUNA_OFFERTA': return 'secondary';
    }
  };

  const getStatusIcon = (status: 'ok' | 'fail' | 'empty') => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fail': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'empty': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Debug Pipeline</h1>
            <p className="text-sm text-muted-foreground">Analisi completa OCR → Supabase → Firecrawl → Parsing</p>
          </div>
          <Button onClick={loadBillsList} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ricarica
          </Button>
        </div>

        {/* SEZIONE 1: Lista Bollette */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lista Bollette per Debug</CardTitle>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nessuna bolletta trovata</p>
            ) : (
              <div className="space-y-2">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                      selectedBill?.id === bill.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => analyzeUpload(bill)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-mono text-xs text-muted-foreground">{bill.id.slice(0, 12)}...</p>
                        <p className="text-sm">
                          {bill.provider || 'N/A'} • {new Date(bill.created_at).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(bill.pipelineStatus)}>
                        {bill.pipelineStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SEZIONE 2: Dettaglio Debug */}
        {selectedBill && debugData && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Dettaglio Debug: {selectedBill.id.slice(0, 20)}...
            </h2>

            {/* BLOCCO OCR */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(debugData.ocr.status)}
                  <FileText className="h-5 w-5" />
                  <CardTitle className="text-base">Blocco 1: OCR Extraction</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {debugData.ocr.status === 'ok' && debugData.ocr.data && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Provider:</span><p className="font-semibold">{debugData.ocr.data.provider || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">POD/PDR:</span><p className="font-semibold">{debugData.ocr.data.pod || debugData.ocr.data.pdr || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Consumo:</span><p className="font-semibold">{debugData.ocr.data.annual_kwh || debugData.ocr.data.gas_smc || 'N/A'}</p></div>
                    <div><span className="text-muted-foreground">Prezzo:</span><p className="font-semibold">{debugData.ocr.data.unit_price_eur_kwh?.toFixed(3) || debugData.ocr.data.prezzo_gas_eur_smc?.toFixed(3) || 'N/A'}</p></div>
                  </div>
                )}
                {debugData.ocr.status === 'fail' && (
                  <div className="bg-red-500/10 p-3 rounded text-sm text-red-600">
                    <p className="font-semibold">⚠ ATTENZIONE: OCR incompleto</p>
                    <p>Campi critici mancanti o null</p>
                  </div>
                )}
                {debugData.ocr.raw_response && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary hover:underline">RAW OCR Response</summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto max-h-40">{JSON.stringify(debugData.ocr.raw_response, null, 2)}</pre>
                  </details>
                )}
              </CardContent>
            </Card>

            {/* BLOCCO SUPABASE */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(debugData.supabase.status)}
                  <Database className="h-5 w-5" />
                  <CardTitle className="text-base">Blocco 2: Supabase Record</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">Tabella: <span className="font-mono">{debugData.supabase.table}</span></p>
                {debugData.supabase.status === 'ok' ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-primary hover:underline">Vedi JSON completo</summary>
                    <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto max-h-60">{JSON.stringify(debugData.supabase.record, null, 2)}</pre>
                  </details>
                ) : (
                  <div className="bg-red-500/10 p-3 rounded text-sm text-red-600">
                    <p className="font-semibold">NESSUN RECORD SUPABASE TROVATO</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BLOCCO FIRECRAWL */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(debugData.firecrawl.status)}
                  <Globe className="h-5 w-5" />
                  <CardTitle className="text-base">Blocco 3: Firecrawl Test</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">
                  Offerte attive: {debugData.firecrawl.response?.count || 0}
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="URL test Firecrawl"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    className="flex-1 text-sm"
                  />
                  <Button onClick={testFirecrawl} disabled={testingFirecrawl} size="sm">
                    <Play className={`h-4 w-4 mr-2 ${testingFirecrawl ? 'animate-pulse' : ''}`} />
                    Test
                  </Button>
                </div>
                {firecrawlTestResult && (
                  <div className={`p-3 rounded text-sm ${firecrawlTestResult.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <p className="font-semibold">{firecrawlTestResult.success ? '✓ Firecrawl OK' : '✗ Firecrawl FAIL'}</p>
                    {firecrawlTestResult.error && <p className="text-red-600">{firecrawlTestResult.error}</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BLOCCO PARSING */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(debugData.parsing.status)}
                  <Filter className="h-5 w-5" />
                  <CardTitle className="text-base">Blocco 4: Parsing & Offerte</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Offerte grezze:</span><p className="font-semibold">{debugData.parsing.raw_offers.length}</p></div>
                  <div><span className="text-muted-foreground">Offerte filtrate:</span><p className="font-semibold">{debugData.parsing.filtered_offers.length}</p></div>
                  <div><span className="text-muted-foreground">Risparmio max:</span><p className="font-semibold">€{debugData.parsing.max_saving.toFixed(2)}</p></div>
                  <div><span className="text-muted-foreground">Soglia minima:</span><p className="font-semibold">€{debugData.parsing.min_threshold}</p></div>
                </div>
                {debugData.parsing.reason && (
                  <div className="bg-yellow-500/10 p-3 rounded text-sm">
                    <p className="font-semibold">{debugData.parsing.reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LOG ERRORI */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Log Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-xs font-mono">
                  {debugData.logs.map((log, idx) => (
                    <div key={idx} className="flex gap-2">
                      <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString('it-IT')}</span>
                      <span className="font-semibold">[{log.step}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
