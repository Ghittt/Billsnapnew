import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, TrendingDown, Sparkles, CheckCircle, ExternalLink, Zap, AlertTriangle, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@/types/analytics';

interface Offer {
  id: string;
  provider: string;
  plan_name: string;
  price_kwh: number | null;
  unit_price_eur_smc: number | null;
  fixed_fee_eur_mo: number;
  offer_annual_cost_eur: number;
  redirect_url: string | null;
  terms_url?: string;
  commodity: string;
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uploadId = searchParams.get('uploadId');
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [ocrData, setOcrData] = useState<any>(null);
  const [bestOffer, setBestOffer] = useState<Offer | null>(null);
  const [alternativeOffers, setAlternativeOffers] = useState<Offer[]>([]);
  const [currentCost, setCurrentCost] = useState<number>(0);
  const [consumption, setConsumption] = useState<number>(0);
  const [analysisAI, setAnalysisAI] = useState<any>(null);
  const [billType, setBillType] = useState<'luce' | 'gas' | 'combo'>('luce');

  useEffect(() => {
    if (!uploadId) {
      toast({
        title: "Errore",
        description: "ID upload mancante",
        variant: "destructive"
      });
      navigate('/upload');
      return;
    }
    fetchRealResults();
  }, [uploadId]);

  const fetchRealResults = async () => {
    try {
      setIsLoading(true);

      // 1. Get OCR data
      const { data: ocrResult, error: ocrError } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('upload_id', uploadId)
        .maybeSingle();

      if (ocrError) {
        console.error('OCR fetch error:', ocrError);
      }

      if (!ocrResult) {
        throw new Error('Nessun risultato OCR trovato');
      }

      setOcrData(ocrResult);

      // Determine bill type and consumption
      const { data: uploadData } = await supabase
        .from('uploads')
        .select('tipo_bolletta')
        .eq('id', uploadId)
        .maybeSingle();

      const tipo = (uploadData?.tipo_bolletta || 'luce') as 'luce' | 'gas' | 'combo';
      setBillType(tipo);

      const consumo = tipo === 'gas' 
        ? (ocrResult.consumo_annuo_smc || ocrResult.gas_smc || 1200)
        : (ocrResult.annual_kwh || 2700);
      
      setConsumption(consumo);

      const costo = ocrResult.costo_annuo_totale || ocrResult.total_cost_eur || consumo * 0.30;
      setCurrentCost(costo);

      // 2. Get comparison results
      const { data: comparisonData, error: compError } = await supabase
        .from('comparison_results')
        .select('*')
        .eq('upload_id', uploadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (compError) {
        console.error('Comparison fetch error:', compError);
      }

      if (comparisonData && comparisonData.ranked_offers && Array.isArray(comparisonData.ranked_offers)) {
        const ranked = comparisonData.ranked_offers as unknown as Offer[];
        if (ranked.length > 0) {
          setBestOffer(ranked[0]);
          setAlternativeOffers(ranked.slice(1, 4)); // Max 3 alternative offers
        }
      }

      // 3. Get AI analysis
      try {
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          'analyze-consumption',
          { body: { ocrData: ocrResult, uploadId, billType: tipo } }
        );

        if (!analysisError && analysisData) {
          setAnalysisAI(analysisData);
        }
      } catch (err) {
        console.error('AI analysis error:', err);
      }

    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nel caricamento dei risultati',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateOffer = async (offer: Offer) => {
    if (!offer.redirect_url) {
      toast({
        title: 'Link non disponibile',
        description: "Il link all'offerta non è disponibile",
        variant: 'destructive'
      });
      return;
    }

    // Track lead
    const annualSaving = currentCost - offer.offer_annual_cost_eur;
    
    await supabase.from('leads').insert({
      upload_id: uploadId || crypto.randomUUID(),
      provider: offer.provider,
      offer_id: offer.id,
      redirect_url: offer.redirect_url,
      offer_annual_cost_eur: offer.offer_annual_cost_eur,
      annual_saving_eur: annualSaving,
      current_annual_cost_eur: currentCost,
    });

    // Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'offer_activated', {
        event_category: 'conversion',
        provider: offer.provider,
        annual_saving: annualSaving
      });
    }

    // Redirect
    window.open(offer.redirect_url, '_blank');
  };

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);

  const annualSaving = bestOffer ? currentCost - bestOffer.offer_annual_cost_eur : 0;
  const monthlySaving = annualSaving / 12;
  const currentMonthly = currentCost / 12;
  const newMonthly = bestOffer ? bestOffer.offer_annual_cost_eur / 12 : currentMonthly;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-12 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Caricamento risultati...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate('/upload')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Analizza un'altra bolletta
        </Button>

        {/* Page Title */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">La tua analisi è pronta</h1>
          <p className="text-muted-foreground text-lg">
            Ho analizzato la tua bolletta {billType} e trovato la migliore offerta per te
          </p>
        </div>

        {/* MODULO 1 - Consumi Attuali */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              I tuoi consumi attuali
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Consumo annuo</p>
                <p className="text-2xl font-bold">{consumption} {billType === 'gas' ? 'Smc' : 'kWh'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fornitore attuale</p>
                <p className="text-2xl font-bold">{ocrData?.provider || 'Non specificato'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tipo bolletta</p>
                <p className="text-2xl font-bold capitalize">{billType}</p>
              </div>
            </div>
            
            {billType === 'luce' && ocrData?.f1_kwh && ocrData?.f2_kwh && ocrData?.f3_kwh && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Distribuzione fasce orarie:</p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">F1 (punta):</span>
                    <span className="ml-2 font-semibold">{ocrData.f1_kwh} kWh</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">F2 (intermedia):</span>
                    <span className="ml-2 font-semibold">{ocrData.f2_kwh} kWh</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">F3 (fuori punta):</span>
                    <span className="ml-2 font-semibold">{ocrData.f3_kwh} kWh</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MODULO 2 - Quanto Spendi Ora */}
        <Card className="border-2 border-yellow-500/20 bg-yellow-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Quanto spendi ora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Costo mensile attuale</p>
                <p className="text-4xl font-bold text-yellow-600">{fmt(currentMonthly)}/mese</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Costo annuale attuale</p>
                <p className="text-2xl font-semibold">{fmt(currentCost)}/anno</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* MODULO 3 - Migliore Offerta */}
        {bestOffer && (
          <Card className="border-2 border-green-500/30 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Migliore offerta trovata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Provider</p>
                <p className="text-3xl font-bold">{bestOffer.provider}</p>
                <p className="text-lg text-muted-foreground">{bestOffer.plan_name}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Prezzo energia</p>
                  <p className="text-xl font-semibold">
                    {billType === 'gas' 
                      ? `${bestOffer.unit_price_eur_smc?.toFixed(3)} €/Smc`
                      : `${bestOffer.price_kwh?.toFixed(3)} €/kWh`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quota fissa</p>
                  <p className="text-xl font-semibold">{fmt(bestOffer.fixed_fee_eur_mo)}/mese</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Costo annuale</p>
                  <p className="text-xl font-semibold">{fmt(bestOffer.offer_annual_cost_eur)}</p>
                </div>
              </div>

              {bestOffer.terms_url && (
                <div>
                  <a 
                    href={bestOffer.terms_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    Vedi termini e condizioni <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* MODULO 4 - Risparmio Reale */}
        {bestOffer && annualSaving > 0 && (
          <Card className="border-2 border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Il tuo risparmio reale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-5xl font-bold text-primary">{fmt(monthlySaving)}/mese</p>
                <p className="text-2xl text-muted-foreground">pari a {fmt(annualSaving)}/anno</p>
                {monthlySaving >= 30 && (
                  <p className="text-lg text-muted-foreground">
                    Circa {monthlySaving >= 80 ? 'un pieno di benzina' : monthlySaving >= 50 ? 'una spesa al supermercato' : 'una pizza in famiglia'} in meno al mese
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Costo mensile attuale</p>
                  <p className="text-xl font-semibold line-through opacity-60">{fmt(currentMonthly)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Nuovo costo mensile</p>
                  <p className="text-xl font-semibold text-green-600">{fmt(newMonthly)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* MODULO 5 - Analisi AI */}
        {analysisAI && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Analisi SnapAI™
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              {analysisAI.sintesi && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-lg font-semibold mb-0">{analysisAI.sintesi}</p>
                </div>
              )}

              {analysisAI.quanto_spendi && (
                <div>
                  <h4 className="text-base font-semibold mb-2">Quanto stai spendendo</h4>
                  <p>{analysisAI.quanto_spendi}</p>
                </div>
              )}

              {analysisAI.fasce_orarie && (
                <div>
                  <h4 className="text-base font-semibold mb-2">Analisi fasce orarie</h4>
                  <p className="mb-2"><strong>Fascia prevalente:</strong> {analysisAI.fasce_orarie.prevalente}</p>
                  <p className="mb-2"><strong>Distribuzione:</strong> {analysisAI.fasce_orarie.distribuzione}</p>
                  {analysisAI.fasce_orarie.suggerimento && (
                    <div className="p-3 bg-blue-500/10 rounded border border-blue-500/20">
                      <p className="mb-0 text-sm">{analysisAI.fasce_orarie.suggerimento}</p>
                    </div>
                  )}
                </div>
              )}

              {analysisAI.consiglio_pratico && (
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <h4 className="text-base font-semibold mb-2">💡 Consiglio pratico</h4>
                  <p className="mb-0">{analysisAI.consiglio_pratico}</p>
                </div>
              )}

              {analysisAI.anomalie && analysisAI.anomalie.length > 0 && (
                <div>
                  <h4 className="text-base font-semibold mb-2">⚠️ Anomalie rilevate</h4>
                  <div className="space-y-2">
                    {analysisAI.anomalie.map((anomalia: any, idx: number) => (
                      <div key={idx} className={`p-3 rounded border ${
                        anomalia.severita === 'warning' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-blue-500/10 border-blue-500/20'
                      }`}>
                        <p className="mb-0 text-sm">{anomalia.messaggio}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysisAI.conclusione && (
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 text-center">
                  <p className="text-lg font-semibold text-primary mb-0">{analysisAI.conclusione}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* MODULO 6 - CTA */}
        {bestOffer && (
          <Card className="border-2 border-primary">
            <CardContent className="py-8">
              <div className="text-center space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Pronto a risparmiare?</h3>
                  <p className="text-muted-foreground">
                    Clicca qui sotto per attivare l'offerta {bestOffer.provider}
                  </p>
                </div>

                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 h-auto"
                  onClick={() => handleActivateOffer(bestOffer)}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  Attiva subito e risparmia {fmt(monthlySaving)}/mese
                </Button>

                <p className="text-sm text-muted-foreground">
                  Verrai reindirizzato al sito del provider per completare l'attivazione
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offerte alternative */}
        {alternativeOffers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Altre offerte competitive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {alternativeOffers.map((offer) => (
                <div key={offer.id} className="p-4 border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-lg">{offer.provider}</p>
                      <p className="text-sm text-muted-foreground">{offer.plan_name}</p>
                    </div>
                    <Badge variant="outline">{fmt(offer.offer_annual_cost_eur)}/anno</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-muted-foreground">Prezzo energia:</span>
                      <span className="ml-2 font-semibold">
                        {billType === 'gas' 
                          ? `${offer.unit_price_eur_smc?.toFixed(3)} €/Smc`
                          : `${offer.price_kwh?.toFixed(3)} €/kWh`}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quota fissa:</span>
                      <span className="ml-2 font-semibold">{fmt(offer.fixed_fee_eur_mo)}/mese</span>
                    </div>
                  </div>
                  {offer.redirect_url && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleActivateOffer(offer)}
                    >
                      Vedi offerta
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default ResultsPage;
