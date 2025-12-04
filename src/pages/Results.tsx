import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@/types/analytics';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SummaryBanner } from '@/components/results/SummaryBanner';
import { IntelligentAnalysis } from '@/components/results/IntelligentAnalysis';
import { ActionSection } from '@/components/results/ActionSection';
import { MethodSection } from '@/components/results/MethodSection';

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
  const [allOffers, setAllOffers] = useState<Offer[]>([]);
  const [currentCost, setCurrentCost] = useState<number>(0);
  const [consumption, setConsumption] = useState<number>(0);
  const [billType, setBillType] = useState<'luce' | 'gas' | 'combo'>('luce');

  // Manual Input State
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualConsumption, setManualConsumption] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!uploadId) {
      toast({
        title: 'Errore',
        description: 'ID upload mancante',
        variant: 'destructive'
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
        .select('*')
        .eq('id', uploadId)
        .maybeSingle();

      let tipo = (uploadData?.tipo_bolletta || 'luce') as 'luce' | 'gas' | 'combo';
      
      // Fallback: infer from OCR data if upload type is missing or default
      if (!uploadData?.tipo_bolletta && ocrResult) {
        if (ocrResult.gas_smc > 0 || ocrResult.consumo_annuo_smc > 0) {
          tipo = 'gas';
        } else if (ocrResult.annual_kwh > 0) {
          tipo = 'luce';
        }
      }
      
      setBillType(tipo);

      // Get consumption from OCR
      const consumo = tipo === 'gas'
        ? (ocrResult.consumo_annuo_smc || ocrResult.gas_smc || 0)
        : (ocrResult.annual_kwh || 0);

      // Get current cost from OCR
      let costo = ocrResult.costo_annuo_totale || ocrResult.total_cost_eur || 0;
      
      // HEURISTIC: Fix "Bill Total" vs "Annual Cost"
      // If cost is suspiciously low relative to consumption (e.g. < 0.10 €/unit), 
      // it's likely a bimonthly bill, not annual cost.
      if (consumo > 0 && costo > 0) {
        const costPerUnit = costo / consumo;
        if (costPerUnit < 0.10) {
          console.warn('Suspiciously low annual cost (' + costo + '€ for ' + consumo + ' units). Assuming bimonthly bill.');
          costo = costo * 6; // Project to annual
        }
      }

      // RELAXED CHECK: Only show manual input if BOTH are missing or zero
      if ((!consumo || consumo <= 0) && (!costo || costo <= 0)) {
        console.warn('Both consumption and cost missing, activating manual fallback');
        setShowManualInput(true);
        setIsLoading(false);
        return;
      }

      setConsumption(Number(consumo));
      setCurrentCost(Number(costo));

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

            // Get best offer and all ranked offers
      if (comparisonData.ranked_offers && Array.isArray(comparisonData.ranked_offers)) {
        const ranked = comparisonData.ranked_offers as unknown as Offer[];
        if (ranked.length === 0) {
          throw new Error('Nessuna offerta disponibile per i tuoi parametri. Riprova più tardi.');
        }
        setBestOffer(ranked[0]);
        setAllOffers(ranked);

        // Trigger AI Analysis after successful data fetch
        fetchAiAnalysis(
          uploadId, 
          Number(consumo), 
          Number(costo) / 12, 
          Number(costo), 
          ocrResult.provider || 'Fornitore sconosciuto', 
          ocrResult.tariff_hint
        );

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
      setTimeout(() => navigate('/upload'), 2000);
    } finally {
      if (!showManualInput) {
        setIsLoading(false);
      }
    }
  };

  // AI Analysis State
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<boolean>(false);

  const fetchAiAnalysis = async (
    uId: string, 
    consumo: number, 
    mensile: number, 
    annuo: number, 
    provider: string, 
    offerta?: string
  ) => {
    try {
      setIsAiLoading(true);
      setAiError(false);
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        'https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/energy-coach',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            upload_id: uId,
            consumo_annuo_kwh: consumo,
            spesa_mensile_corrente: mensile,
            spesa_annua_corrente: annuo,
            fornitore_attuale: provider,
            tipo_offerta_attuale: offerta || 'non specificato'
          })
        }
      );

      if (!response.ok) throw new Error('AI Error');
      
      const data = await response.json();
      if (data.ok && data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        throw new Error('Invalid AI response');
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setAiError(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    try {
      setIsUpdating(true);
      const kwh = parseFloat(manualConsumption);
      const eur = parseFloat(manualCost);

      if (isNaN(kwh) || kwh <= 0 || isNaN(eur) || eur <= 0) {
        toast({
          title: 'Dati non validi',
          description: 'Inserisci valori numerici positivi',
          variant: 'destructive'
        });
        return;
      }

      const updateData: any = {
        total_cost_eur: eur,
        quality_score: 1.0,
        tariff_hint: 'manual_fallback'
      };

      if (billType === 'gas') {
        updateData.gas_smc = kwh;
        updateData.consumo_annuo_smc = kwh;
      } else {
        updateData.annual_kwh = kwh;
      }

      const { error: updateError } = await supabase
        .from('ocr_results')
        .update(updateData)
        .eq('upload_id', uploadId);

      if (updateError) throw updateError;

      const { error: compareError } = await supabase.functions.invoke('compare-offers', {
        body: { uploadId }
      });

      if (compareError) throw compareError;

      setShowManualInput(false);
      setIsLoading(true);
      fetchRealResults();

    } catch (error) {
      console.error('Manual update failed:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare i dati. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setIsUpdating(false);
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

    if (typeof gtag !== 'undefined') {
      gtag('event', 'offer_activated', {
        event_category: 'conversion',
        provider: offer.provider,
        annual_saving: annualSaving
      });
    }
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
  const hasSavings = monthlySaving > 0;

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background'>
        <Header />
        <div className='container mx-auto px-4 py-12 flex items-center justify-center'>
          <div className='text-center space-y-4'>
            <Loader2 className='h-12 w-12 animate-spin mx-auto text-primary' />
            <p className='text-muted-foreground'>Caricamento risultati...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-background'>
      <Header />
      <main className='container mx-auto px-4 py-8 max-w-4xl'>
        {/* Navigation */}
        <Button
          variant='ghost'
          onClick={() => navigate('/upload')}
          className='gap-2 mb-6'
        >
          <ArrowLeft className='h-4 w-4' />
          Analizza un'altra bolletta
        </Button>

        {/* HERO / RIASSUNTO */}
        <div className='text-center space-y-8 py-8'>
          <div>
            <h1 className='text-4xl md:text-5xl font-bold mb-3'>La tua analisi</h1>
            <p className='text-lg md:text-xl text-muted-foreground'>
              Dati reali estratti dalla tua bolletta {billType}
            </p>
          </div>

          {/* Le 2 card principali */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Card 1: Spendi ora */}
            <Card className='border-2'>
              <CardContent className='p-6 md:p-8 text-center space-y-3'>
                <p className='text-sm text-muted-foreground uppercase tracking-wide font-medium'>Spendi ora</p>
                <p className='text-4xl md:text-5xl font-bold'>{fmt(currentMonthly)}</p>
                <p className='text-sm text-muted-foreground'>al mese</p>
                <div className='pt-4 border-t mt-4 space-y-1'>
                  <p className='text-xs text-muted-foreground'>Consumo: {consumption.toLocaleString('it-IT')} {billType === 'gas' ? 'Smc' : 'kWh'}</p>
                  <p className='text-xs text-muted-foreground'>Fornitore: {ocrData?.provider || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Con l'offerta migliore */}
            {bestOffer && (
              <Card className='border-2 border-primary/30'>
                <CardContent className='p-6 md:p-8 text-center space-y-3'>
                  <p className='text-sm text-muted-foreground uppercase tracking-wide font-medium'>Con l'offerta migliore</p>
                  <p className='text-4xl md:text-5xl font-bold text-primary'>{fmt(newMonthly)}</p>
                  <p className='text-sm text-muted-foreground'>al mese</p>
                  <div className='pt-4 border-t mt-4 space-y-1'>
                    <p className='text-xs font-semibold'>{bestOffer.provider}</p>
                    <p className='text-xs text-muted-foreground'>{bestOffer.plan_name}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* BANNER RIASSUNTO DECISIONE */}
          {bestOffer && (
            <SummaryBanner
              hasSavings={hasSavings}
              monthlySaving={monthlySaving}
              yearlySaving={annualSaving}
              bestOfferName={bestOffer.plan_name}
              bestOfferProvider={bestOffer.provider}
              currentProvider={ocrData?.provider || 'provider attuale'}
            />
          )}

          {/* ANALISI INTELLIGENTE */}
          {/* ANALISI INTELLIGENTE */}
          {bestOffer && (
            <IntelligentAnalysis
              consumption={consumption}
              billType={billType}
              currentMonthly={currentMonthly}
              currentAnnual={currentCost}
              currentProvider={ocrData?.provider || 'provider attuale'}
              currentOfferType={ocrData?.tariff_hint}
              bestOfferName={bestOffer.plan_name}
              bestOfferProvider={bestOffer.provider}
              bestOfferMonthly={newMonthly}
              bestOfferAnnual={bestOffer.simulated_cost}
              savingMonthly={monthlySaving}
              savingAnnual={annualSaving}
              aiAnalysis={aiAnalysis}
              isLoading={isAiLoading}
              error={aiError}
            />
          )}

          {/* SEZIONE AZIONE */}
          {bestOffer && (
            <ActionSection
              hasSavings={hasSavings}
              savingMonthly={monthlySaving}
              bestOfferUrl={bestOffer.redirect_url}
              bestOfferProvider={bestOffer.provider}
              onActivate={() => handleActivateOffer(bestOffer)}
            />
          )}

          {/* COME ABBIAMO FATTO L'ANALISI */}
          {allOffers.length > 0 && (
            <MethodSection
              offersCount={allOffers.length}
              providersCount={new Set(allOffers.map(o => o.provider)).size}
              providers={Array.from(new Set(allOffers.map(o => o.provider)))}
            />
          )}

          {/* FOOTER TRASPARENZA */}
          <div className='pt-4 text-center'>
            <p className='text-xs text-muted-foreground leading-relaxed max-w-2xl mx-auto'>
              Le cifre mostrate sono stime basate sui dati della tua bolletta e sui prezzi disponibili al momento dell'analisi. 
              Gli importi finali possono variare in base alle condizioni contrattuali e ai consumi effettivi.
            </p>
          </div>
        </div>
      </main>

      <Dialog open={showManualInput} onOpenChange={setShowManualInput}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dati mancanti</DialogTitle>
            <DialogDescription>
              Non siamo riusciti a trovare il consumo o il costo annuo nella tua bolletta (potrebbe essere una nuova fornitura).
              Inserisci i dati manualmente per continuare.
            </DialogDescription>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='consumption' className='text-right'>
                Consumo ({billType === 'gas' ? 'Smc' : 'kWh'})
              </Label>
              <Input
                id='consumption'
                type='number'
                value={manualConsumption}
                onChange={(e) => setManualConsumption(e.target.value)}
                className='col-span-3'
                placeholder='Es. 2700'
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='cost' className='text-right'>
                Spesa Annua (€)
              </Label>
              <Input
                id='cost'
                type='number'
                value={manualCost}
                onChange={(e) => setManualCost(e.target.value)}
                className='col-span-3'
                placeholder='Es. 1200'
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleManualSubmit} disabled={isUpdating}>
              {isUpdating ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : null}
              Salva e Calcola
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResultsPage;
