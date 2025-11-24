import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, FileSearch } from 'lucide-react';

export default function DebugOCR() {
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [ocrDebug, setOcrDebug] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOCRData();
  }, []);

  const fetchOCRData = async () => {
    setLoading(true);
    try {
      // Get OCR results
      const { data: results } = await supabase
        .from('ocr_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      // Get OCR debug logs
      const { data: debugLogs } = await supabase
        .from('ocr_debug')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setOcrResults(results || []);
      setOcrDebug(debugLogs || []);
    } catch (error) {
      console.error('Error fetching OCR data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileSearch className="h-8 w-8" />
              Debug OCR
            </h1>
            <p className="text-muted-foreground">Visualizza output OCR grezzo salvato in Supabase</p>
          </div>
          <Button onClick={fetchOCRData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ricarica
          </Button>
        </div>

        {/* OCR Results */}
        <Card>
          <CardHeader>
            <CardTitle>Ultimi 10 risultati OCR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ocrResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nessun risultato OCR trovato</p>
            ) : (
              ocrResults.map((result) => (
                <div key={result.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">Upload ID: {result.upload_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.created_at).toLocaleString('it-IT')}
                      </p>
                    </div>
                    <Badge variant={result.quality_score > 0.8 ? 'default' : result.quality_score > 0.5 ? 'secondary' : 'destructive'}>
                      Quality: {(result.quality_score * 100).toFixed(0)}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <p className="font-semibold">{result.provider || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">kWh annui:</span>
                      <p className="font-semibold">{result.annual_kwh || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prezzo:</span>
                      <p className="font-semibold">{result.unit_price_eur_kwh?.toFixed(3) || 'N/A'} €/kWh</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Costo totale:</span>
                      <p className="font-semibold">{result.total_cost_eur?.toFixed(0) || 'N/A'} €</p>
                    </div>
                  </div>

                  {result.pod && (
                    <div>
                      <span className="text-muted-foreground text-sm">POD:</span>
                      <p className="font-mono text-xs">{result.pod}</p>
                    </div>
                  )}

                  {result.raw_json && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-primary hover:underline">
                        Vedi JSON grezzo
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(result.raw_json, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* OCR Debug Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Ultimi 10 debug log OCR</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ocrDebug.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nessun log di debug trovato</p>
            ) : (
              ocrDebug.map((log) => (
                <div key={log.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">Upload ID: {log.upload_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('it-IT')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {log.used_defaults && <Badge variant="secondary">Defaults</Badge>}
                      {log.errors && <Badge variant="destructive">Errors</Badge>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Routing:</span>
                      <p className="font-semibold">{log.routing_choice || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Provider:</span>
                      <p className="font-semibold">{log.provider_detected || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Confidence:</span>
                      <p className="font-semibold">{log.confidence_avg ? (log.confidence_avg * 100).toFixed(0) + '%' : 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pagina:</span>
                      <p className="font-semibold">{log.pagina_usata || 'N/A'}</p>
                    </div>
                  </div>

                  {log.errors && (
                    <div className="p-3 bg-destructive/10 rounded text-sm">
                      <p className="font-semibold mb-1">Errori:</p>
                      <p className="text-destructive">{log.errors}</p>
                    </div>
                  )}

                  {log.raw_json && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-primary hover:underline">
                        Vedi JSON completo
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.raw_json, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
