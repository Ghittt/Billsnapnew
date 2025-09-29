import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { BestOfferCard } from '@/components/results/BestOfferCard';
import { AlternativeOfferCard } from '@/components/results/AlternativeOfferCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Zap, Loader2 } from 'lucide-react';
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

      // Fetch verified offers (primary)
      const { data: offersResponse, error: offersError } = await supabase.functions.invoke(
        'get-verified-offers',
        { body: { annual_kwh: consumption } }
      );

      let finalPayload: OffersPayload | null = null;

      if (!offersError && offersResponse?.best_offer) {
        finalPayload = offersResponse as OffersPayload;
      } else {
        // Fallback A: use robust server function
        const { data: bestResp, error: bestErr } = await supabase.functions.invoke(
          'get-best-offer',
          { body: { commodity: 'power', annualKwh: consumption, annualSmc: 0 } }
        );

        if (!bestErr && bestResp?.best_offer) {
          const mapOffer = (o: any) => ({
            id: o.id || o.offer_id || crypto.randomUUID(),
            provider: o.provider,
            offer_name: o.plan_name,
            price_kwh: o.unit_price_eur_kwh ?? o.price_kwh ?? 0,
            fixed_fee_month: o.fixed_fee_eur_mo ?? o.fixed_fee_month ?? 0,
            fixed_fee_year: (o.fixed_fee_eur_mo ?? o.fixed_fee_month ?? 0) * 12,
            offer_annual_cost_eur: o.offer_annual_cost_eur ?? Math.round(consumption * (o.unit_price_eur_kwh || 0) + (o.fixed_fee_eur_mo || 0) * 12),
            source_url: o.redirect_url || o.source || o.terms_url || '',
            terms_url: o.terms_url || undefined,
            last_checked: o.last_update || o.updated_at || new Date().toISOString(),
          });

          const best = mapOffer(bestResp.best_offer);
          const list = (bestResp.offers || bestResp.allOffersResponse || []).map(mapOffer);
          finalPayload = { best_offer: best, offers: list };
        } else {
          console.warn('Server fallbacks failed, using client-side computation', bestErr);
          // Fallback B: compute on client directly from offers table
          const { data: dbOffers, error: dbErr } = await supabase
            .from('offers')
            .select('*')
            .eq('is_active', true)
            .eq('commodity', 'power')
            .order('created_at', { ascending: false });

          if (dbErr || !dbOffers || dbOffers.length === 0) {
            console.error('Client fallback failed:', dbErr);
            throw new Error('NO_OFFERS');
          }

          const mapped = dbOffers.map((o: any) => {
            const price = Number(o.unit_price_eur_kwh || o.price_kwh || 0);
            const feeMo = Number(o.fixed_fee_eur_mo || o.fixed_fee_month || 0);
            const total = Math.round(consumption * price + feeMo * 12);
            return {
              id: o.id,
              provider: o.provider,
              offer_name: o.plan_name,
              price_kwh: price,
              fixed_fee_month: feeMo,
              fixed_fee_year: feeMo * 12,
              offer_annual_cost_eur: total,
              source_url: o.redirect_url || o.source || o.terms_url || '',
              terms_url: o.terms_url || undefined,
              last_checked: o.updated_at || o.created_at,
            } as Offer;
          });

          mapped.sort((a, b) => a.offer_annual_cost_eur - b.offer_annual_cost_eur);
          finalPayload = { best_offer: mapped[0], offers: mapped };
        }
      }


      setOffersData(finalPayload);

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

  const handleViewOffer = (offerId: string) => {
    navigate(`/offer/${offerId}`);
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
  const alternativeOffers = (offersData?.offers || [])
    .filter(o => o.id !== (offersData?.best_offer?.id || ''))
    .slice(0, 5);
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

  // Non bloccare la pagina per errori/assenza best offer: continuiamo a renderizzare con stati vuoti


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
              onActivate={() => handleViewOffer(offersData.best_offer.id)}
              isLoading={false}
            />
          )}

          {/* D) Alternative offers */}
          {alternativeOffers.length > 0 ? (
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
                    onSelect={() => handleViewOffer(offer.id)}
                    isLoading={false}
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

          {/* E) Transparency notes */}
          <div className="text-center text-sm text-muted-foreground space-y-2 pt-4 border-t">
            <p>Costi stimati in base ai tuoi consumi. Verifica sempre le condizioni ufficiali del fornitore.</p>
            {offersData?.best_offer?.last_checked && (
              <p>Ultimo aggiornamento prezzi: {new Date(offersData.best_offer.last_checked).toLocaleDateString('it-IT')}</p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      {offersData?.best_offer && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:hidden">
          <Button 
            className="w-full h-12 text-lg font-semibold"
            onClick={() => handleViewOffer(offersData.best_offer.id)}
          >
            {`Vedi offerta e risparmia ${fmt(annualSaving)}`}
          </Button>
        </div>
      )}

    </div>
  );
};

export default ResultsPage;
