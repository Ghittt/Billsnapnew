import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function DebugAI() {
  const [comparisonResults, setComparisonResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIData();
  }, []);

  const fetchAIData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('comparison_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setComparisonResults(data || []);
    } catch (error) {
      console.error('Error fetching AI data:', error);
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
              <Sparkles className="h-8 w-8" />
              Debug AI
            </h1>
            <p className="text-muted-foreground">Visualizza input/output AI analysis e explanations</p>
          </div>
          <Button onClick={fetchAIData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Ricarica
          </Button>
        </div>

        {/* AI Comparison Results */}
        <Card>
          <CardHeader>
            <CardTitle>Ultimi 10 risultati AI comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {comparisonResults.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Nessun risultato AI trovato</p>
            ) : (
              comparisonResults.map((result) => (
                <div key={result.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">Upload ID: {result.upload_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(result.created_at).toLocaleString('it-IT')}
                      </p>
                    </div>
                    {result.best_offer_id && (
                      <Badge variant="default">Best Offer ID: {result.best_offer_id.slice(0, 8)}...</Badge>
                    )}
                  </div>

                  {/* Profile JSON (Input to AI) */}
                  {result.profile_json && (
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline mb-2">
                        📥 Input AI: Profile JSON
                      </summary>
                      <div className="p-3 bg-blue-500/10 rounded">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(result.profile_json, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}

                  {/* Ranked Offers (Output from AI) */}
                  {result.ranked_offers && (
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline mb-2">
                        📤 Output AI: Ranked Offers ({Array.isArray(result.ranked_offers) ? result.ranked_offers.length : 0})
                      </summary>
                      <div className="p-3 bg-green-500/10 rounded space-y-2">
                        {Array.isArray(result.ranked_offers) ? (
                          result.ranked_offers.map((offer: any, idx: number) => (
                            <div key={idx} className="p-2 bg-background rounded text-xs">
                              <p className="font-semibold">#{idx + 1} - {offer.provider}</p>
                              <p>Piano: {offer.plan_name || 'N/A'}</p>
                              <p>Costo annuo: €{offer.simulated_cost || offer.offer_annual_cost_eur}</p>
                              {offer.breakdown && (
                                <p className="text-muted-foreground">
                                  Breakdown: Fisso €{offer.breakdown.fixed}, 
                                  Energia €{offer.breakdown.energy}
                                </p>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-muted-foreground">Nessuna offerta rankata</p>
                        )}
                      </div>
                    </details>
                  )}

                  {/* AI Explanation */}
                  {result.ai_explanation && (
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline mb-2">
                        🤖 AI Explanation
                      </summary>
                      <div className="p-3 bg-purple-500/10 rounded">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(result.ai_explanation, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}

                  {/* Personalization Factors */}
                  {result.personalization_factors && (
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold text-primary hover:underline mb-2">
                        🎯 Personalization Factors
                      </summary>
                      <div className="p-3 bg-yellow-500/10 rounded">
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(result.personalization_factors, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Calculation Logs */}
        <CalcLogs />
      </main>
    </div>
  );
}

function CalcLogs() {
  const [calcLogs, setCalcLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalcLogs();
  }, []);

  const fetchCalcLogs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('calc_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setCalcLogs(data || []);
    } catch (error) {
      console.error('Error fetching calc logs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Caricamento logs...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ultimi 10 calculation logs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {calcLogs.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nessun log di calcolo trovato</p>
        ) : (
          calcLogs.map((log) => (
            <div key={log.id} className="p-4 border rounded-lg space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">Upload ID: {log.upload_id || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('it-IT')}
                  </p>
                </div>
                <Badge variant="outline">{log.tipo}</Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Consumo:</span>
                  <p className="font-semibold">{log.consumo || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prezzo:</span>
                  <p className="font-semibold">{log.prezzo?.toFixed(3) || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quota fissa:</span>
                  <p className="font-semibold">{log.quota_fissa_mese?.toFixed(2) || 'N/A'} €/mese</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Costo annuo:</span>
                  <p className="font-semibold">{log.costo_annuo?.toFixed(0) || 'N/A'} €</p>
                </div>
              </div>

              {log.flags && Object.keys(log.flags).length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-semibold mb-1">Flags:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(log.flags).map(([key, value]) => (
                      <Badge key={key} variant={value ? 'destructive' : 'secondary'} className="text-xs">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
