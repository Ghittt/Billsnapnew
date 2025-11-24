import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, TrendingDown, AlertCircle, Zap } from 'lucide-react';
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
  simulated_cost: number;
  redirect_url: string | null;
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
  const [currentCost, setCurrentCost] = useState<number>(0);
  const [consumption, setConsumption] = useState<number>(0);
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

      // 1. Get OCR data - MUST exist
      const { data: ocrResult, error: ocrError } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('upload_id', uploadId)
        .maybeSingle();

      if (ocrError || !ocrResult) {
        console.error('OCR fetch error:', ocrError);
        throw new Error('Impossibile recuperare i dati della bolletta. Riprova caricando un file più nitido.');
      }

      setOcrData(ocrResult);

      // Determine bill type
      const { data: uploadData } = await supabase
        .from('uploads')
        .select('tipo_bolletta')
        .eq('id', uploadId)
        .maybeSingle();

      const tipo = (uploadData?.tipo_bolletta || 'luce') as 'luce' | 'gas' | 'combo';
      setBillType(tipo);

      // Get consumption from OCR
      const consumo = tipo === 'gas' 
        ? (ocrResult.consumo_annuo_smc || ocrResult.gas_smc)
        : (ocrResult.annual_kwh);
      
      if (!consumo || consumo <= 0) {
        throw new Error('Consumo non valido rilevato dal OCR. Riprova con una bolletta più chiara.');
      }

      setConsumption(consumo);

      // Get current cost from OCR
      const costo = ocrResult.costo_annuo_totale || ocrResult.total_cost_eur;
      if (!costo || costo <= 0) {
        throw new Error('Costo totale non rilevato. Riprova con una bolletta più chiara.');
      }

      setCurrentCost(costo);

      // 2. Get comparison results - MUST exist
      const { data: comparisonData, error: compError } = await supabase
        .from('comparison_results')
        .select('*')
        .eq('upload_id', uploadId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (compError || !comparisonData) {
        console.error('Comparison fetch error:', compError);
        throw new Error('Nessuna offerta disponibile per i tuoi parametri. Riprova più tardi.');
      }

      // Get best offer
      if (comparisonData.ranked_offers && Array.isArray(comparisonData.ranked_offers)) {
        const ranked = comparisonData.ranked_offers as unknown as Offer[];
        if (ranked.length === 0) {
          throw new Error('Nessuna offerta disponibile per i tuoi parametri. Riprova più tardi.');
        }
        setBestOffer(ranked[0]);
      } else {
        throw new Error('Nessuna offerta disponibile per i tuoi parametri. Riprova più tardi.');
      }

    } catch (error) {
      console.error('Error fetching results:', error);
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nel caricamento dei risultati',
        variant: 'destructive'
      });
      
      // Block navigation - go back to upload
      setTimeout(() => navigate('/upload'), 2000);
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
    const annualSaving = currentCost - offer.simulated_cost;
    
    await supabase.from('leads').insert({
      upload_id: uploadId || crypto.randomUUID(),
      provider: offer.provider,
      offer_id: offer.id,
      redirect_url: offer.redirect_url,
      offer_annual_cost_eur: offer.simulated_cost,
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

  const annualSaving = bestOffer ? currentCost - bestOffer.simulated_cost : 0;
  const monthlySaving = annualSaving / 12;
  const currentMonthly = currentCost / 12;
  const newMonthly = bestOffer ? bestOffer.simulated_cost / 12 : currentMonthly;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate('/upload')}
          className="gap-2 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Analizza un'altra bolletta
        </Button>

        {/* Hero Numbers - Apple Style */}
        <div className="text-center space-y-12 py-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-4">La tua analisi</h1>
            <p className="text-xl text-muted-foreground">Dati reali estratti dalla tua bolletta {billType}</p>
          </div>

          {/* I 3 NUMERI CHIAVE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Quanto spendi ora */}
            <Card className="border-2">
              <CardContent className="p-8 text-center space-y-2">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Spendi ora</p>
                <p className="text-5xl font-bold">{fmt(currentMonthly)}</p>
                <p className="text-sm text-muted-foreground">al mese</p>
                <div className="pt-4 border-t mt-4">
                  <p className="text-xs text-muted-foreground">Consumo: {consumption} {billType === 'gas' ? 'Smc' : 'kWh'}</p>
                  <p className="text-xs text-muted-foreground">Provider: {ocrData?.provider || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Quanto spenderesti */}
            {bestOffer && (
              <Card className="border-2 border-green-500/50 bg-green-500/5">
                <CardContent className="p-8 text-center space-y-2">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">Spenderesti</p>
                  <p className="text-5xl font-bold text-green-600">{fmt(newMonthly)}</p>
                  <p className="text-sm text-muted-foreground">al mese</p>
                  <div className="pt-4 border-t mt-4">
                    <p className="text-xs font-semibold">{bestOffer.provider}</p>
                    <p className="text-xs text-muted-foreground">{bestOffer.plan_name}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quanto risparmi */}
            {bestOffer && annualSaving > 0 && (
              <Card className="border-2 border-primary/50 bg-primary/5">
                <CardContent className="p-8 text-center space-y-2">
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">Risparmi</p>
                  <p className="text-5xl font-bold text-primary">{fmt(monthlySaving)}</p>
                  <p className="text-sm text-muted-foreground">al mese</p>
                  <div className="pt-4 border-t mt-4">
                    <TrendingDown className="h-6 w-6 mx-auto text-primary mb-1" />
                    <p className="text-xs text-muted-foreground">{fmt(annualSaving)} all'anno</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* No savings scenario */}
          {bestOffer && annualSaving <= 0 && (
            <Card className="border-2 border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-8 text-center space-y-4">
                <AlertCircle className="h-12 w-12 mx-auto text-blue-600" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">La tua tariffa è già competitiva</h3>
                  <p className="text-muted-foreground">
                    Non abbiamo trovato offerte migliori rispetto a quella che hai ora.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTA - Attiva offerta */}
          {bestOffer && annualSaving > 0 && (
            <Card className="border-2 border-primary">
              <CardContent className="p-8 text-center space-y-6">
                <div>
                  <h3 className="text-3xl font-bold mb-2">Pronto per risparmiare?</h3>
                  <p className="text-muted-foreground">
                    Clicca per attivare l'offerta con {bestOffer.provider}
                  </p>
                </div>

                <Button 
                  size="lg" 
                  className="text-xl px-12 py-8 h-auto gradient-hero"
                  onClick={() => handleActivateOffer(bestOffer)}
                >
                  <Zap className="h-6 w-6 mr-2" />
                  Attiva e risparmia {fmt(monthlySaving)}/mese
                </Button>

                <p className="text-sm text-muted-foreground">
                  Verrai reindirizzato al sito ufficiale del provider per completare l'attivazione
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResultsPage;
