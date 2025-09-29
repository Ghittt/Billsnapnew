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
    // Always attempt to load results; if uploadId is missing we proceed with defaults
    fetchResults();
  }, [uploadId]);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Defaults if no OCR or no uploadId
      let consumption = 2700;
      let estimatedCurrentCost = Math.round(consumption * 0.30);

      if (uploadId) {
        // Try to read OCR results safely (non-blocking)
        const { data: ocrData, error: ocrError } = await supabase
          .from('ocr_results')
          .select('*')
          .eq('upload_id', uploadId)
          .maybeSingle();

        if (ocrError) {
          console.warn('OCR fetch warning (non-blocking):', ocrError);
        }

        if (ocrData) {
          consumption = Number(ocrData.annual_kwh ?? consumption);
          estimatedCurrentCost = Number(ocrData.total_cost_eur ?? consumption * 0.30);
        }
      }

      setAnnualKwh(consumption);
      setCurrentCost(estimatedCurrentCost);

      // DB-FIRST: fetch active offers to avoid empty UI
      let finalPayload: OffersPayload | null = null;

      const mapOffer = (o: any): Offer => {
        let src = o.redirect_url || o.source_url || '';
        if (src && !/^https?:\/\//i.test(src)) {
          src = `https://${String(src).replace(/^\/+/, '')}`;
        }
        return {
          id: o.id || o.offer_id || crypto.randomUUID(),
          provider: o.provider || 'Provider sconosciuto',
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
        };
      };

      // Fetch from DB (commodity power), then relax filter if empty
      const { data: dbOffersPower, error: dbErrPower } = await supabase
        .from('offers')
        .select('*')
        .eq('is_active', true)
        .eq('commodity', 'power')
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
        description: 'Il link all\'offerta non è disponibile.',
        variant: 'destructive'
      });
      return;
    }

    // Open immediately to avoid popup blockers
    const opened = window.open(offer.source_url, '_blank', 'noopener,noreferrer');

    // Fire-and-forget lead tracking (do not await)
    void supabase
      .from('leads')
      .insert({
        upload_id: uploadId || crypto.randomUUID(),
        provider: offer.provider,
        offer_id: offer.id,
        redirect_url: offer.source_url,
        offer_annual_cost_eur: offer.offer_annual_cost_eur,
      })
      .select();

    if (typeof gtag !== 'undefined') {
      gtag('event', 'offer_click', {
        event_category: 'conversion',
        provider: offer.provider,
        annual_cost: offer.offer_annual_cost_eur
      });
    }

    // Fallback: if popup blocked, navigate in same tab
    if (!opened) {
      window.location.href = offer.source_url;
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
              onActivate={() => handleViewOffer(offersData.best_offer)}
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
                     fixedFeeMonth={offer.fixed_fee_month}
                     annualCost={offer.offer_annual_cost_eur}
                     source={offer.source_url}
                     onSelect={() => handleViewOffer(offer)}
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

    </div>
  );
};

export default ResultsPage;
