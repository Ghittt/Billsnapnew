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
import { IntelligentAnalysis } from '@/components/results/IntelligentAnalysis';
import { MethodSection } from '@/components/results/MethodSection';
import { ReferralCard } from '@/components/results/ReferralCard';
import RedirectPopup from '@/components/results/RedirectPopup';
import { getOfferUrl } from '@/utils/offerUrls';
import { fixOfferUrlCommodity } from '@/utils/offerUrlFixer';

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
  promo_text?: string | null;
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
  const [analyzerResult, setAnalyzerResult] = useState<any>(null);
  const [hasGoodOffer, setHasGoodOffer] = useState(false);

  // Manual Input State
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualConsumption, setManualConsumption] = useState('');
  const [manualCost, setManualCost] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Redirect Popup State
  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [redirectData, setRedirectData] = useState<{provider: string; offerName: string; url: string} | null>(null);

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

      const { data: uploadData } = await supabase
        .from('uploads')
        .select('*')
        .eq('id', uploadId)
        .maybeSingle();

      let tipo = (uploadData?.tipo_bolletta || 'luce') as 'luce' | 'gas' | 'combo';
      
      if (!uploadData?.tipo_bolletta && ocrResult) {
        if (ocrResult.gas_smc > 0 || ocrResult.consumo_annuo_smc > 0) {
          tipo = 'gas';
        } else if (ocrResult.annual_kwh > 0) {
          tipo = 'luce';
        }
      }
      
      setBillType(tipo);

      const consumo = tipo === 'gas'
        ? (ocrResult.consumo_annuo_smc || ocrResult.gas_smc || 0)
        : (ocrResult.annual_kwh || 0);

      let costo = ocrResult.costo_annuo_totale || ocrResult.total_cost_eur || 0;
      
      if (consumo > 0 && costo > 0) {
        const costPerUnit = costo / consumo;
        if (costPerUnit < 0.10) {
          console.warn('Suspiciously low annual cost (' + costo + '€ for ' + consumo + ' units). Assuming bimonthly bill.');
          costo = costo * 6;
        }
      }

      if ((!consumo || consumo <= 0) && (!costo || costo <= 0)) {
        console.warn('Both consumption and cost missing, activating manual fallback');
        setShowManualInput(true);
        setIsLoading(false);
        return;
      }

      setConsumption(Number(consumo));
      // DON'T setCurrentCost here! Wait for bill-analyzer response

      // Fetch real offers from database
      const { data: allOffersData } = await supabase
        .from('energy_offers')
        .select('*')
        .eq('is_active', true);

      const offerteLuce = (allOffersData || []).filter(o => 
        o.commodity === 'luce' || o.commodity === 'electricity' || o.tipo_fornitura === 'luce'
      );
      const offerteGas = (allOffersData || []).filter(o => 
        o.commodity === 'gas' || o.tipo_fornitura === 'gas'
      );

      // Call bill-analyzer to get proper filtered offers
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const analyzerResponse = await fetch(
        'https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/bill-analyzer',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ocr: ocrResult.raw_json || {
              tipo_fornitura: tipo,
              provider: ocrResult.provider,
              bolletta_luce: tipo === 'luce' ? {
                presente: true,
                consumo_annuo_kwh: consumo,
                totale_periodo_euro: costo,
                periodo: { mesi: 12 }
              } : { presente: false },
              bolletta_gas: tipo === 'gas' ? {
                presente: true,
                consumo_annuo_smc: consumo,
                totale_periodo_euro: costo,
                periodo: { mesi: 12 }
              } : { presente: false }
            },
            profilo_utente: { eta: 30, isee_range: 'medio' },
            offerte_luce: offerteLuce,
            offerte_gas: offerteGas,
            parametri_business: { soglia_risparmio_significativo_mese: 5 }
          })
        }
      );

      if (analyzerResponse.ok) {
        const analyzerData = await analyzerResponse.json();
        setAnalyzerResult(analyzerData);
        console.log('[Results] BillSnap Core response:', analyzerData);
        
        // New BillSnap Core structure
        // For DUAL: { commodity_final: "DUAL", luce: {...}, gas: {...} }
        // For single: { commodity_final: "LUCE"|"GAS", current: {...}, best_offer: {...}, decision: {...}, savings: {...}, expert_copy: {...} }
        
        let targetData = analyzerData;
        
        // Handle DUAL case
        if (analyzerData.commodity_final === "DUAL") {
          targetData = tipo === 'gas' ? analyzerData.gas : analyzerData.luce;
        }
        
        // Set current cost from Core response
        if (targetData?.current?.annual_eur) {
          setCurrentCost(Number(targetData.current.annual_eur));
        }
        
        // Handle decision.action with switch statement
        const action = targetData?.decision?.action;
        const copy = targetData?.expert_copy;
        
        // Helper: Generate AI text from expert_copy
        const generateAiText = (expertCopy, includeProsCons = false) => {
          if (!expertCopy) return "";
          let text = "#### " + expertCopy.headline + "\n\n";
          text += expertCopy.summary_3_lines?.join("\n\n") + "\n\n";
          if (includeProsCons && expertCopy.pros_cons?.switch?.length > 0) {
            text += "**Vantaggi del cambio:**\n" + expertCopy.pros_cons.switch.map(p => "- " + p).join("\n") + "\n\n";
          }
          if (includeProsCons && expertCopy.pros_cons?.stay?.length > 0) {
            text += "**Se resti dove sei:**\n" + expertCopy.pros_cons.stay.map(p => "- " + p).join("\n") + "\n\n";
          }
          text += "**Prossimi passi:**\n" + (expertCopy.next_steps || []).map((s, i) => (i+1) + ". " + s).join("\n");
          if (expertCopy.disclaimer) text += "\n\n*" + expertCopy.disclaimer + "*";
          return text;
        };
        
        switch (action) {
          case "SWITCH": {
            // renderSwitch() - Show offer cards and recommendation
            console.log('[Results] Decision: SWITCH');
            const best = targetData.best_offer;
            const savings = targetData.savings;
            
            if (best) {
              const ranked = [{
                id: best.offer_name || 'best-1',
                provider: best.provider,
                plan_name: best.offer_name,
                simulated_cost: best.annual_eur || 0,
                tipo_prezzo: best.price_type?.toLowerCase() || 'variabile',
                risparmio_mensile: savings?.monthly_eur || 0,
                link: best.link
              }];
              
              setBestOffer(ranked[0]);
              setAllOffers(ranked);
            }
            setAiAnalysis(generateAiText(copy, true));
            break;
          }
          
          case "STAY":
          case "INSUFFICIENT_DATA": {
            // renderStayExplanation() - Show explanation why NOT to switch
            console.log('[Results] Decision: ' + action + ' - ' + targetData?.decision?.reason);
            setHasGoodOffer(true);
            setAiAnalysis(generateAiText(copy, false));
            setIsLoading(false);
            return; // Exit early, no offers to show
          }
          
          case "ASK_CLARIFICATION": {
            // renderQuestion() - Ask user for more info
            console.log('[Results] Decision: ASK_CLARIFICATION - ' + targetData?.decision?.reason);
            setHasGoodOffer(false);
            const questionText = "#### Abbiamo bisogno di più informazioni\n\n" + (targetData?.decision?.reason || "Per favore carica una bolletta più completa.");
            setAiAnalysis(questionText);
            setIsLoading(false);
            return; // Exit early
          }
          
          default: {
            console.warn('[Results] Unknown action:', action);
            setAiAnalysis("#### Analisi non disponibile\n\nNon siamo riusciti a elaborare la tua bolletta. Riprova.");
          }
        }
      } else {
        console.error('[Results] Bill-analyzer request failed');
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
    offerta: string | undefined,
    f1: number,
    f2: number,
    f3: number,
    priceKwh: number,
    offertaFissa?: any,
    offertaVariabile?: any
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
            tipo_offerta_attuale: offerta || 'non specificato',
            f1_consumption: f1,
            f2_consumption: f2,
            f3_consumption: f3,
            current_price_kwh: priceKwh,
            offerta_fissa: offertaFissa ? {
                nome_offerta: offertaFissa.nome || offertaFissa.plan_name,
                provider: offertaFissa.fornitore || offertaFissa.provider,
                costo_annuo: (offertaFissa.costo_mensile ? offertaFissa.costo_mensile * 12 : offertaFissa.simulated_cost)
            } : null,
            offerta_variabile: offertaVariabile ? {
                nome_offerta: offertaVariabile.nome || offertaVariabile.plan_name,
                provider: offertaVariabile.fornitore || offertaVariabile.provider,
                costo_annuo: (offertaVariabile.costo_mensile ? offertaVariabile.costo_mensile * 12 : offertaVariabile.simulated_cost)
            } : null
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
    // Use specific offer URL if available, otherwise fallback to provider homepage
    // ALWAYS use homepage - database URLs are often broken
    const providerUrl = false 
      ? offer.redirect_url 
      : getOfferUrl(offer.provider, offer.plan_name);
    
    const annualSaving = currentCost - offer.simulated_cost;

    await supabase.from('leads').insert({
      upload_id: uploadId || crypto.randomUUID(),
      provider: offer.provider,
      offer_id: offer.id,
      redirect_url: providerUrl,
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
    
    // Show popup with instructions instead of direct redirect
    setRedirectData({
      provider: offer.provider,
      offerName: offer.plan_name,
      url: providerUrl
    });
    setShowRedirectPopup(true);
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
  
  // Generate offer URL using utility function
  const bestOfferUrl = bestOffer 
    ? (bestOffer.redirect_url || getOfferUrl(bestOffer.provider, bestOffer.plan_name))
    : null;

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
        <Button
          variant='ghost'
          onClick={() => navigate('/upload')}
          className='gap-2 mb-6'
        >
          <ArrowLeft className='h-4 w-4' />
          Analizza un'altra bolletta
        </Button>

        <div className='text-center space-y-4 py-4 mb-8'>
          <h1 className='text-4xl md:text-5xl font-bold'>La tua analisi personalizzata</h1>
          <p className='text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto'>
            Dati reali estratti dalla tua bolletta e confrontati con le migliori offerte disponibili oggi.
          </p>
        </div>

        <div className='space-y-12'>
          <div className={hasGoodOffer ? 'grid grid-cols-1 gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6'}>
            <Card className='border-2 shadow-sm'>
              <CardContent className='p-6 md:p-8 text-center space-y-4'>
                <p className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>SPENDI ORA</p>
                
                <div className='py-2'>
                  <span className='text-5xl font-bold'>{fmt(currentMonthly)}</span>
                  <p className='text-sm text-muted-foreground mt-1'>al mese</p>
                </div>

                <div className='border-t pt-4 space-y-2 text-sm text-muted-foreground'>
                  <p>≈ {fmt(currentCost)} all'anno</p>
                  <p>Consumo annuo: {consumption.toLocaleString('it-IT')} {billType === 'gas' ? 'Smc' : 'kWh'}</p>
                  <p>Fornitore attuale: <span className='font-medium text-foreground'>{ocrData?.provider || 'N/A'}</span></p>
                  {ocrData?.tariff_hint && (
                    <p>Tipo offerta: {ocrData.tariff_hint}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {bestOffer && !hasGoodOffer && (
              <Card className='border-2 border-primary/40 shadow-md relative overflow-hidden'>
                <div className='absolute top-0 left-0 w-full h-1 bg-primary'></div>
                <CardContent className='p-6 md:p-8 text-center space-y-4'>
                  <p className='text-xs font-bold uppercase tracking-widest text-primary'>CON L'OFFERTA MIGLIORE PER TE</p>
                  
                  <div className='py-2'>
                    <span className='text-5xl font-bold text-primary'>{fmt(newMonthly)}</span>
                    <p className='text-sm text-muted-foreground mt-1'>al mese</p>
                  </div>

                  <div className='border-t pt-4 space-y-2 text-sm text-muted-foreground'>
                    <p>≈ {fmt(bestOffer.simulated_cost)} all'anno</p>
                    <p>Offerta consigliata: <span className='font-medium text-foreground'>{bestOffer.plan_name}</span></p>
                    <p>Fornitore: <span className='font-medium text-foreground'>{bestOffer.provider}</span></p>
                    
                    <div className='pt-2 mt-2 bg-green-50 text-green-700 p-2 rounded-md font-medium'>
                      Risparmio stimato: {fmt(monthlySaving)}/mese
                      <span className='block text-xs opacity-80'>(≈ {fmt(annualSaving)}/anno)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {hasGoodOffer && (
            <Card className='border-2 border-green-500/40 shadow-md bg-green-50/50'>
              <CardContent className='p-8 text-center space-y-4'>
                <h2 className='text-3xl font-bold text-green-700'>🎉 Ottima Notizia!</h2>
                <p className='text-lg text-green-900'>
                  Hai già l'offerta migliore sul mercato per il tuo profilo di consumo.
                </p>
                <p className='text-muted-foreground'>
                  Non ha senso cambiare fornitore. Continua così!
                </p>
              </CardContent>
            </Card>
          )}

          {bestOffer && !hasGoodOffer && (
            <p className='text-center text-muted-foreground text-sm italic'>
              Questa è l'offerta che oggi risulta più conveniente per il tuo profilo di consumo.
            </p>
          )}

          {bestOffer && !hasGoodOffer && (
            <div className="mt-8">
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
                onActivate={() => handleActivateOffer(bestOffer)}
                bestOfferPromo={bestOffer.promo_text}
              />
              
              {/* Review CTA */}
              <div className="mt-8 bg-gradient-to-r from-purple-50 to-white px-6 py-8 rounded-2xl border border-purple-100 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="text-center md:text-left space-y-2">
                  <h3 className="font-bold text-xl text-primary">Ti piace BillSnap?</h3>
                  <p className="text-muted-foreground max-w-md">
                    Se ti abbiamo aiutato a risparmiare o a capire meglio la tua bolletta, lasciaci una recensione! 
                    Ci aiuta a crescere e migliorare.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/feedback')}
                  variant="outline" 
                  className="bg-white hover:bg-purple-50 border-purple-200 text-purple-700 font-medium px-8 py-6 h-auto text-lg hover:scale-105 transition-transform"
                >
                  Lascia una Recensione ⭐
                </Button>
              </div>
            </div>
          )}

          <ReferralCard savingAmount={annualSaving} />

          {allOffers.length > 0 && (
            <MethodSection
              offersCount={allOffers.length}
              providersCount={new Set(allOffers.map(o => o.provider)).size}
              providers={Array.from(new Set(allOffers.map(o => o.provider)))}
            />
          )}
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

      {/* Redirect Popup with Instructions */}
      <RedirectPopup
        isOpen={showRedirectPopup}
        provider={redirectData?.provider || ''}
        offerName={redirectData?.offerName || ''}
        providerUrl={redirectData?.url || ''}
        onClose={() => setShowRedirectPopup(false)}
      />
    </div>
  );
};

export default ResultsPage;
