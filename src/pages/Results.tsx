import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { BestOfferCard } from '@/components/results/BestOfferCard';
import { AlternativeOfferCard } from '@/components/results/AlternativeOfferCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Zap, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import '@/types/analytics';

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
  const [loadingOfferId, setLoadingOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadId) {
      setError('ID upload mancante');
      setIsLoading(false);
      return;
    }

    fetchResults();
  }, [uploadId]);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch OCR results to get consumption data
      const { data: ocrData, error: ocrError } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('upload_id', uploadId)
        .single();

      if (ocrError) throw ocrError;

      const consumption = ocrData.annual_kwh || 2700;
      const estimatedCurrentCost = ocrData.total_cost_eur || consumption * 0.30;
      
      setAnnualKwh(consumption);
      setCurrentCost(estimatedCurrentCost);

      // Fetch verified offers
      const { data: offersResponse, error: offersError } = await supabase.functions.invoke(
        'get-verified-offers',
        {
          body: {
            annual_kwh: consumption,
          }
        }
      );

      if (offersError || !offersResponse?.best_offer) {
        throw new Error('NO_OFFERS');
      }

      setOffersData(offersResponse);

      // Track analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', 'result_shown', {
          event_category: 'engagement',
          annual_kwh: consumption,
          best_offer_provider: offersResponse.best_offer?.provider
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

  const handleActivateOffer = async (offer: Offer, isAlternative = false) => {
    if (!uploadId) {
      toast({
        title: 'Errore',
        description: 'Dati di sessione mancanti',
        variant: 'destructive'
      });
      return;
    }

    if (!offer.source_url) {
      toast({
        title: 'Link non disponibile',
        description: 'Link offerta non disponibile al momento',
        variant: 'destructive'
      });
      return;
    }

    setLoadingOfferId(offer.id);

    try {
      // Detect device
      const userAgent = navigator.userAgent.toLowerCase();
      let device = 'web';
      if (userAgent.includes('mobile') || userAgent.includes('android')) device = 'mobile';
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) device = 'ios';

      // Extract UTM parameters
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source') || 'organic';

      const annualSaving = currentCost - offer.offer_annual_cost_eur;

      // Save lead (non-blocking)
      const leadPayload = {
        upload_id: uploadId,
        offer_id: offer.id,
        provider: offer.provider,
        annual_saving_eur: annualSaving,
        current_annual_cost_eur: currentCost,
        offer_annual_cost_eur: offer.offer_annual_cost_eur,
        redirect_url: offer.source_url,
        utm_source: utmSource,
        device: device
      };

      // Don't wait for lead save, redirect immediately
      supabase.functions.invoke('save-lead', { body: leadPayload }).catch(console.error);

      // Track analytics
      if (typeof gtag !== 'undefined') {
        gtag('event', isAlternative ? 'alt_offer_clicked' : 'cta_clicked', {
          event_category: 'conversion',
          provider: offer.provider,
          plan: offer.offer_name,
          annual_saving: annualSaving
        });
      }

      // Immediate redirect
      window.location.href = offer.source_url;

    } catch (err) {
      console.error('Error activating offer:', err);
      toast({
        title: 'Errore',
        description: 'Non riesco ad aprire la pagina del fornitore',
        variant: 'destructive'
      });
      setLoadingOfferId(null);
    }
  };

  // Calculate savings
  const annualSaving = offersData?.best_offer 
    ? currentCost - offersData.best_offer.offer_annual_cost_eur 
    : 0;

  const getSavingsMessage = () => {
    if (annualSaving < 50) {
      return `La tua offerta è già tra le migliori (risparmio minimo €${Math.round(annualSaving)}/anno)`;
    }
    return `Ti ho trovato un'offerta che ti fa risparmiare €${Math.round(annualSaving)}/anno rispetto alla tua bolletta attuale.`;
  };

  // Get alternative offers (exclude best offer, show max 5)
  const alternativeOffers = offersData?.offers
    ?.filter(o => o.id !== offersData.best_offer.id)
    ?.slice(0, 5) || [];

  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Caricamento risultati...</p>
        </div>
      </div>
    );
  }

  if (error || !offersData?.best_offer) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold">Offerte temporaneamente non disponibili</h2>
            <p className="text-muted-foreground">
              Non riusciamo a recuperare le offerte al momento. Riprova tra qualche minuto.
            </p>
            <Button onClick={() => navigate('/')}>
              Torna alla home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24 md:pb-8">
      <Header />
      
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Nuova analisi
            </Button>
          </div>

          {/* A) Savings message */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary mb-4">
              <Zap className="w-6 h-6" />
              <span className="font-medium">Analisi completata</span>
            </div>
            <p className="text-xl md:text-2xl font-semibold max-w-2xl mx-auto">
              {getSavingsMessage()}
            </p>
          </div>

          {/* B) Current cost card */}
          <Card className="text-center p-6">
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">Costo attuale stimato</p>
              <p className="text-4xl font-bold text-foreground">{fmt(currentCost)}</p>
              <p className="text-xs text-muted-foreground">all'anno ({annualKwh.toLocaleString()} kWh)</p>
            </CardContent>
          </Card>

          {/* C) Best offer card with CTA */}
          <BestOfferCard
            provider={offersData.best_offer.provider}
            offerName={offersData.best_offer.offer_name}
            priceKwh={offersData.best_offer.price_kwh}
            fixedFeeYear={offersData.best_offer.fixed_fee_year}
            annualCost={offersData.best_offer.offer_annual_cost_eur}
            lastUpdate={offersData.best_offer.last_checked}
            source={offersData.best_offer.source_url}
            termsUrl={offersData.best_offer.terms_url}
            onActivate={() => handleActivateOffer(offersData.best_offer)}
            isLoading={loadingOfferId === offersData.best_offer.id}
          />

          {/* D) Alternative offers */}
          {alternativeOffers.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Altre offerte competitive</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alternativeOffers.map((offer) => (
                  <AlternativeOfferCard
                    key={offer.id}
                    provider={offer.provider}
                    offerName={offer.offer_name}
                    priceKwh={offer.price_kwh}
                    fixedFeeYear={offer.fixed_fee_year}
                    annualCost={offer.offer_annual_cost_eur}
                    source={offer.source_url}
                    onSelect={() => handleActivateOffer(offer, true)}
                    isLoading={loadingOfferId === offer.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* E) Transparency notes */}
          <div className="text-center text-sm text-muted-foreground space-y-2 pt-4 border-t">
            <p>Costi stimati in base ai tuoi consumi. Verifica sempre le condizioni ufficiali del fornitore.</p>
            <p>Ultimo aggiornamento prezzi: {new Date(offersData.best_offer.last_checked).toLocaleDateString('it-IT')}</p>
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:hidden">
        <Button 
          className="w-full h-12 text-lg font-semibold"
          onClick={() => handleActivateOffer(offersData.best_offer)}
          disabled={loadingOfferId === offersData.best_offer.id}
        >
          {loadingOfferId === offersData.best_offer.id ? (
            'Reindirizzamento...'
          ) : (
            `Attiva e risparmia ${fmt(annualSaving)}`
          )}
        </Button>
      </div>
    </div>
  );
};

export default ResultsPage;
