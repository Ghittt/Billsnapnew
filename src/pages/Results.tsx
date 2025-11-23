import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { BestOfferCard } from '@/components/results/BestOfferCard';
import { AlternativeOfferCard } from '@/components/results/AlternativeOfferCard';
import { EmailOptInBox } from '@/components/results/EmailOptInBox';
import { ConsumptionAnalysis } from '@/components/results/ConsumptionAnalysis';
import { MonthlySavingsHighlight } from '@/components/results/MonthlySavingsHighlight';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { ConfirmDataForm } from '@/components/upload/ConfirmDataForm';
import { ArrowLeft, Zap, Loader2, TrendingDown, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateWithGuardRails } from '@/lib/ocrValidation';
import '@/types/analytics';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface Offer {
  id: string;
  provider: string;
  offer_name: string;
  price_kwh: number;
  fixed_fee_month: number;
  fixed_fee_year: number;
  offer_annual_cost_eur: number;
  source_url: string;
  terms_url?: string;
  last_checked: string;
  url_ok?: boolean;
  provider_home?: string;
}

interface OffersPayload {
  best_offer: Offer;
  offers: Offer[];
}

const ResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uploadId = searchParams.get('uploadId');
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offersData, setOffersData] = useState<OffersPayload | null>(null);
  const [currentCost, setCurrentCost] = useState<number>(0);
  const [annualKwh, setAnnualKwh] = useState<number>(2700);
  const [explanations, setExplanations] = useState<Record<string, any>>({});
  const [userProfile, setUserProfile] = useState<any>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [billType, setBillType] = useState<'luce' | 'gas' | 'combo'>('luce');
  const [consumptionAnalysis, setConsumptionAnalysis] = useState<any>(null);

  useEffect(() => {
    // Always attempt to load results; if uploadId is missing we proceed with defaults
    fetchResults();
  }, [uploadId]);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch user profile if authenticated (for AI personalization only, not required)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        setUserProfile(profile);
      }

      // Defaults if no OCR or no uploadId
      let consumption = 2700;
      let estimatedCurrentCost = Math.round(consumption * 0.30);

      if (uploadId) {
        // Try to read OCR results safely (non-blocking)
        const { data: fetchedOcrData, error: ocrError } = await supabase
          .from('ocr_results')
          .select('*')
          .eq('upload_id', uploadId)
          .maybeSingle();

        if (ocrError) {
          console.warn('OCR fetch warning (non-blocking):', ocrError);
        }

        // Get bill type from upload
        const { data: uploadData } = await supabase
          .from('uploads')
          .select('tipo_bolletta')
          .eq('id', uploadId)
          .maybeSingle();
        
        if (uploadData?.tipo_bolletta) {
          setBillType(uploadData.tipo_bolletta as 'luce' | 'gas' | 'combo');
        }

        if (fetchedOcrData) {
          setOcrData(fetchedOcrData);
          consumption = Number(fetchedOcrData.annual_kwh ?? consumption);
          estimatedCurrentCost = Number(fetchedOcrData.total_cost_eur ?? consumption * 0.30);
          
          // Validate OCR data with guard-rails
          const calcResult = calculateWithGuardRails({
            consumo_annuo_kwh: fetchedOcrData.annual_kwh,
            prezzo_kwh: fetchedOcrData.unit_price_eur_kwh,
            quota_fissa_mese: null, // Not extracted from OCR yet
            tipo: 'luce',
            confidence: fetchedOcrData.quality_score ? {
              consumo_annuo_kwh: fetchedOcrData.quality_score,
              prezzo_kwh: fetchedOcrData.quality_score
            } : undefined
          });
          
          setCalculationResult(calcResult);
          
          // If data needs confirmation, show form before proceeding
          if (calcResult.needsConfirmation) {
            setShowConfirmForm(true);
            setIsLoading(false);
            return;
          }
          
          // Use validated data
          if (calcResult.costo_annuo) {
            estimatedCurrentCost = calcResult.costo_annuo;
          }

          // Generate consumption analysis with AI
          try {
            const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
              'analyze-consumption',
              { body: { ocrData: fetchedOcrData, uploadId, userProfile, billType } }
            );

            if (!analysisError && analysisData) {
              setConsumptionAnalysis(analysisData);
              console.log('Consumption analysis generated successfully');
            }
          } catch (analysisErr) {
            console.error('Error generating consumption analysis:', analysisErr);
            // Continue without analysis
          }
        }
      }

      setAnnualKwh(consumption);
      setCurrentCost(estimatedCurrentCost);

      // DB-FIRST: fetch active offers to avoid empty UI
      let finalPayload: OffersPayload | null = null;

      const mapOffer = (o: any): Offer => {
        // Priority: product_url (verified deeplink) > redirect_url > provider_home (fallback)
        let src = o.product_url || o.redirect_url || o.provider_home || '';
        
        // Normalize URL: ensure https://
        if (src && !/^https?:\/\//i.test(src)) {
          src = `https://${String(src).replace(/^\/+/, '')}`;
        }
        
        return {
          id: o.id || o.offer_id || crypto.randomUUID(),
          provider: o.provider_name || o.provider || 'Provider sconosciuto',
          offer_name: o.plan_name || o.offer_name || 'Offerta',
          price_kwh: Number(o.unit_price_eur_kwh ?? o.price_kwh ?? 0),
          fixed_fee_month: Number(o.fixed_fee_eur_mo ?? o.fixed_fee_month ?? 0),
          fixed_fee_year: Number(o.fixed_fee_eur_mo ?? o.fixed_fee_month ?? 0) * 12,
          offer_annual_cost_eur:
            Number(
              (
                (o.offer_annual_cost_eur as number | undefined) ??
                Math.round(consumption * Number(o.unit_price_eur_kwh ?? o.price_kwh ?? 0) + Number(o.fixed_fee_eur_mo ?? o.fixed_fee_month ?? 0) * 12)
              )
            ),
          source_url: src || '#',
          terms_url: o.terms_url || '',
          last_checked: o.last_update || o.updated_at || o.created_at || new Date().toISOString(),
          url_ok: o.url_ok ?? undefined,
          provider_home: o.provider_home || undefined,
        };
      };

      // Fetch from DB (commodity power), prefer verified URLs
      const { data: dbOffersPower, error: dbErrPower } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .eq('commodity', 'power')
        .or('url_ok.eq.true,url_ok.is.null') // Only verified or unchecked offers
        .order('url_ok', { ascending: false, nullsFirst: false }) // Verified first
        .order('created_at', { ascending: false });

      let activeOffers: any[] = [];
      if (!dbErrPower && Array.isArray(dbOffersPower) && dbOffersPower.length > 0) {
        activeOffers = dbOffersPower;
      } else {
        const { data: dbOffersAny } = await supabase
          .from('offers')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        activeOffers = Array.isArray(dbOffersAny) ? dbOffersAny : [];
      }

      if (activeOffers.length > 0) {
        const mapped = activeOffers.map(mapOffer);
        mapped.sort((a, b) => a.offer_annual_cost_eur - b.offer_annual_cost_eur);
        finalPayload = { best_offer: mapped[0], offers: mapped };
        // Set immediately so UI never shows an empty state when DB has data
        setOffersData(finalPayload);
      }

      // Try verified offers (may override DB payload if available)
      const { data: offersResponse, error: offersError } = await supabase.functions.invoke(
        'get-verified-offers',
        { body: { annual_kwh: consumption } }
      );

      if (!offersError && (offersResponse as any)?.best_offer) {
        finalPayload = offersResponse as OffersPayload;
        setOffersData(finalPayload);
      }

      // ALWAYS-ON: Generate AI explanations even without OCR or uploadId
      if (finalPayload) {
        try {
          // Build profile from OCR if available, else use defaults
          let profile = {
            total_kwh_year: consumption,
            provider_attuale: null,
            prezzo_kwh_attuale: null,
            quota_fissa_mese: null,
            potenza_kw: 3
          };

          let flags = {
            price_missing: false,
            low_confidence: false,
            already_best: false,
            tier_consumi: consumption < 2000 ? 'low' : consumption > 3500 ? 'high' : 'med'
          };

          if (uploadId) {
            const { data: ocrData } = await supabase
              .from('ocr_results')
              .select('*')
              .eq('upload_id', uploadId)
              .maybeSingle();

            if (ocrData) {
              profile = {
                total_kwh_year: Number(ocrData.annual_kwh ?? consumption),
                provider_attuale: null,
                prezzo_kwh_attuale: Number(ocrData.unit_price_eur_kwh) || null,
                quota_fissa_mese: null,
                potenza_kw: Number(ocrData.potenza_kw ?? 3)
              };
              flags.price_missing = !ocrData.unit_price_eur_kwh || Number(ocrData.unit_price_eur_kwh) === 0;
              flags.low_confidence = (ocrData.quality_score || 1) < 0.85;
            }
          }

          // Prepare offers to explain (best + top 5 alternatives)
          const offersToExplain = [
            finalPayload.best_offer,
            ...finalPayload.offers.filter(o => o.id !== finalPayload.best_offer.id).slice(0, 5)
          ].map(o => ({
            offer_id: o.id,
            provider: o.provider,
            plan_name: o.offer_name,
            price_kwh: o.price_kwh,
            fee_month: o.fixed_fee_month,
            total_year: o.offer_annual_cost_eur,
            current_cost_eur: estimatedCurrentCost
          }));

          const { data: aiExplanations, error: aiError } = await supabase.functions.invoke(
            'explain-choice',
            { body: { profile, offers: offersToExplain, userProfile, flags, billType } }
          );

          if (!aiError && Array.isArray(aiExplanations)) {
            const explainMap: Record<string, any> = {};
            aiExplanations.forEach((exp: any) => {
              if (exp.offer_id) {
                explainMap[exp.offer_id] = exp;
              }
            });
            setExplanations(explainMap);
          }
        } catch (aiErr) {
          console.error('Error generating AI explanations:', aiErr);
          // Continue without explanations
        }
      }

      // Track analytics
      if (typeof gtag !== 'undefined' && finalPayload?.best_offer) {
        gtag('event', 'result_shown', {
          event_category: 'engagement',
          annual_kwh: consumption,
          best_offer_provider: finalPayload.best_offer.provider
        });
      }

    } catch (err) {
      console.error('Error fetching results:', err);
      setError('Errore nel caricamento dei risultati');
      toast({
        title: 'Errore',
        description: 'Non riesco a caricare i risultati. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewOffer = (offer: Offer) => {
    if (!offer.source_url || offer.source_url === '#') {
      toast({
        title: 'Link non disponibile',
        description: "Il link all'offerta non è disponibile.",
        variant: 'destructive'
      });
      return;
    }

    // Calculate savings for lead tracking
    const annualSavingForLead = Math.max(0, currentCost - offer.offer_annual_cost_eur);

    // Tracciamento lead completo
    void supabase
      .from('leads')
      .insert({
        upload_id: uploadId || crypto.randomUUID(),
        provider: offer.provider,
        offer_id: offer.id,
        redirect_url: offer.source_url,
        offer_annual_cost_eur: offer.offer_annual_cost_eur,
        annual_saving_eur: annualSavingForLead,
        current_annual_cost_eur: currentCost,
      })
      .select();

    if (typeof gtag !== 'undefined') {
      gtag('event', 'offer_click', {
        event_category: 'conversion',
        provider: offer.provider,
        annual_cost: offer.offer_annual_cost_eur,
        annual_saving: annualSavingForLead
      });
    }
  };

  const handleConfirmData = async (confirmedData: { consumo: number; spesa?: number; prezzo: number }) => {
    setShowConfirmForm(false);
    setIsLoading(true);

    try {
      // Recalculate with confirmed data
      const recalcResult = calculateWithGuardRails({
        consumo_annuo_kwh: confirmedData.consumo,
        prezzo_kwh: confirmedData.prezzo,
        quota_fissa_mese: null,
        tipo: 'luce',
        confidence: { consumo_annuo_kwh: 1.0, prezzo_kwh: 1.0 } // User confirmed = 100% confidence
      });

      // Log to calc_log
      await supabase.from('calc_log').insert({
        upload_id: uploadId || null,
        tipo: 'luce',
        consumo: confirmedData.consumo,
        prezzo: confirmedData.prezzo,
        quota_fissa_mese: null,
        costo_annuo: recalcResult.costo_annuo,
        flags: recalcResult.flags
      });

      // Update state with confirmed data
      setAnnualKwh(confirmedData.consumo);
      setCurrentCost(confirmedData.spesa || recalcResult.costo_annuo || confirmedData.consumo * 0.30);
      setCalculationResult(recalcResult);

      // Update OCR data if uploadId exists
      if (uploadId) {
        await supabase.from('ocr_results').upsert({
          upload_id: uploadId,
          annual_kwh: confirmedData.consumo,
          unit_price_eur_kwh: confirmedData.prezzo,
          total_cost_eur: confirmedData.spesa || recalcResult.costo_annuo,
          quality_score: 1.0 // User confirmed
        });
      }

      toast({
        title: 'Perfetto!',
        description: 'Ora posso confrontare davvero mele con mele. 🚀'
      });

      // Reload results with confirmed data
      await fetchResults();
    } catch (error) {
      console.error('Error confirming data:', error);
      toast({
        title: 'Errore',
        description: 'Errore durante la conferma dei dati',
        variant: 'destructive'
      });
      setIsLoading(false);
    }
  };

  // Calculate savings (monthly focus)
  const annualSaving = offersData?.best_offer 
    ? currentCost - offersData.best_offer.offer_annual_cost_eur 
    : 0;
  const monthlySaving = annualSaving / 12;
  const currentMonthlyCost = currentCost / 12;
  const newMonthlyCost = offersData?.best_offer 
    ? offersData.best_offer.offer_annual_cost_eur / 12 
    : currentMonthlyCost;

  const getSavingsMessage = () => {
    if (monthlySaving < 5) {
      return `La tua offerta è già tra le migliori (risparmio minimo di circa €${Math.round(monthlySaving)}/mese)`;
    }
    return `Ti ho trovato un'offerta che ti fa risparmiare circa €${Math.round(monthlySaving)}/mese (circa €${Math.round(annualSaving)}/anno)`;
  };

  // Get alternative offers (exclude best offer, show max 5)
  const alternativeOffers = (offersData?.offers || [])
    .filter(o => o.id !== (offersData?.best_offer?.id || ''))
    .slice(0, 5);
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);


  if (showConfirmForm) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <main className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/upload')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Carica un'altra bolletta
            </Button>
          </div>
          <ConfirmDataForm
            tipo="luce"
            initialData={{
              fornitore: ocrData?.provider || undefined,
              consumo: ocrData?.annual_kwh || calculationResult?.consumo,
              spesa: ocrData?.total_cost_eur,
              prezzo: ocrData?.unit_price_eur_kwh || calculationResult?.prezzo
            }}
            onConfirm={handleConfirmData}
            onCancel={() => {
              setShowConfirmForm(false);
              setIsLoading(false);
            }}
          />
        </main>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Non bloccare la pagina per errori/assenza best offer: continuiamo a renderizzare con stati vuoti


  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header with bill type */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Nuova analisi
              </Button>
              <h1 className="text-xl font-semibold text-muted-foreground ml-2">
                {billType === 'gas' ? 'Analisi bolletta gas' : 
                 billType === 'combo' ? 'Analisi combinata luce + gas' : 
                 'Analisi bolletta luce'}
              </h1>
            </div>
          </div>

          {/* Savings highlight - PRIMARY FOCUS */}
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardContent className="p-8 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <TrendingDown className="w-6 h-6" />
                <span className="text-sm font-medium uppercase tracking-wide">Il tuo risparmio</span>
              </div>
              <p className="text-5xl font-bold text-primary">
                Risparmi {fmt(Math.round(annualSaving))} <span className="text-2xl">all'anno</span>
              </p>
              <p className="text-base font-medium text-foreground/70 mt-2">
                {billType === 'gas' 
                  ? 'Stesso gas, meno costi.' 
                  : 'Stessa energia, meno costi.'
                }
              </p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mt-3">
                {annualSaving < 50 
                  ? "La tua offerta è già tra le migliori. Ti avviserò se trovo opportunità migliori."
                  : "Questa offerta ti fa risparmiare senza cambiare abitudini."
                }
              </p>
            </CardContent>
          </Card>

          {/* Current cost - SECONDARY INFO */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Costo stimato con la nuova offerta</p>
            <p className="text-2xl font-semibold text-foreground/80">
              {offersData?.best_offer ? fmt(offersData.best_offer.offer_annual_cost_eur) : fmt(currentCost)}
              <span className="text-base text-muted-foreground ml-2">
                (da {fmt(currentCost)})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {billType === 'gas' 
                ? `${annualKwh.toLocaleString()} Smc all'anno`
                : `${annualKwh.toLocaleString()} kWh all'anno`
              }
            </p>
          </div>

          {/* Providers analyzed */}
          {offersData && offersData.offers.length > 0 && (
            <Card className="glass">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Zap className="w-4 h-4" />
                    <p className="text-sm font-medium">Analisi completa del mercato</p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Ho analizzato <span className="font-semibold text-foreground">{offersData.offers.length} offerte</span> da{' '}
                    <span className="font-semibold text-foreground">
                      {Array.from(new Set(offersData.offers.map(o => o.provider))).length} provider
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                    {Array.from(new Set(offersData.offers.map(o => o.provider)))
                      .sort()
                      .map((provider) => (
                        <span
                          key={provider}
                          className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                        >
                          {provider}
                        </span>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Bell */}
          {offersData?.best_offer && (
            <NotificationBell
              uploadId={uploadId}
              currentProvider={ocrData?.provider}
              estimatedSaving={currentCost - offersData.best_offer.offer_annual_cost_eur}
            />
          )}

          {/* SnapAI Badge */}
          {offersData?.best_offer && (
            <div className="flex justify-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className="px-4 py-2 text-sm bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors cursor-help"
                    >
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      Powered by SnapAI™
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-center">
                    <p className="text-sm">
                      SnapAI è la nostra intelligenza proprietaria. Presto disponibile in versione completa.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Consumption Analysis Section */}
          {consumptionAnalysis && (
            <div className="mb-8">
              <ConsumptionAnalysis analysis={consumptionAnalysis} />
            </div>
          )}

          {/* Monthly Savings Highlight */}
          {offersData?.best_offer && monthlySaving >= 5 && (
            <div className="mb-8">
              <MonthlySavingsHighlight
                monthlySaving={monthlySaving}
                annualSaving={annualSaving}
                currentMonthlyCost={currentMonthlyCost}
                newMonthlyCost={newMonthlyCost}
                currentAnnualCost={currentCost}
                newAnnualCost={offersData.best_offer.offer_annual_cost_eur}
              />
            </div>
          )}

          {/* C) Best offer card with CTA */}
          {offersData?.best_offer && (
            <BestOfferCard
              provider={offersData.best_offer.provider}
              offerName={offersData.best_offer.offer_name}
              priceKwh={offersData.best_offer.price_kwh}
              fixedFeeYear={offersData.best_offer.fixed_fee_year}
              annualCost={offersData.best_offer.offer_annual_cost_eur}
              lastUpdate={offersData.best_offer.last_checked}
              source={offersData.best_offer.source_url}
              termsUrl={offersData.best_offer.terms_url}
              onActivate={() => handleViewOffer(offersData.best_offer)}
              isLoading={false}
              urlVerified={offersData.best_offer.url_ok}
              explanation={explanations[offersData.best_offer.id]}
            />
          )}

          {/* Alternative offers */}
          {alternativeOffers.length > 0 ? (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Altre offerte</h3>
              <div className="grid gap-4">
                {alternativeOffers.map((offer) => (
                  <AlternativeOfferCard
                    key={offer.id}
                    provider={offer.provider}
                    offerName={offer.offer_name}
                    priceKwh={offer.price_kwh}
                    fixedFeeMonth={offer.fixed_fee_month}
                    annualCost={offer.offer_annual_cost_eur}
                    source={offer.source_url}
                    onSelect={() => handleViewOffer(offer)}
                    isLoading={false}
                    urlVerified={offer.url_ok}
                    explanation={explanations[offer.id]}
                  />
                ))}
              </div>
            </div>
          ) : (
            !offersData?.best_offer && (
              <div className="text-center text-muted-foreground">
                Nessuna offerta disponibile al momento. Riprova più tardi.
              </div>
            )
          )}

          {/* Email Opt-in Box - Optional for saving data */}
          <EmailOptInBox
            uploadId={uploadId || undefined}
            ocrData={ocrData}
            bestOffer={offersData?.best_offer}
            currentCost={currentCost}
          />

          {/* Notes */}
          <div className="text-center text-sm text-muted-foreground space-y-1 pt-6 border-t">
            <p>Costi stimati. Verifica le condizioni ufficiali.</p>
            {offersData?.best_offer?.last_checked && (
              <p>Aggiornato: {new Date(offersData.best_offer.last_checked).toLocaleDateString('it-IT')}</p>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default ResultsPage;
