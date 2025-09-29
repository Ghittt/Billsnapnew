import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, ExternalLink, Leaf, Zap, Euro, Calendar } from 'lucide-react';

interface Offer {
  id: string;
  provider: string;
  plan_name: string;
  unit_price_eur_kwh: number;
  fixed_fee_eur_mo: number;
  commodity: string;
  pricing_type: string;
  is_green?: boolean;
  redirect_url?: string;
  terms_url?: string;
  area?: string;
  updated_at: string;
}

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [annualCost, setAnnualCost] = useState<number>(0);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    const fetchOffer = async () => {
      try {
        const { data, error } = await supabase
          .from('offers')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast({
            title: "Offerta non trovata",
            description: "L'offerta richiesta non esiste.",
            variant: "destructive",
          });
          navigate('/');
          return;
        }

        setOffer(data);
        
        // Calculate annual cost with default 2700 kWh
        const defaultKwh = 2700;
        const cost = defaultKwh * data.unit_price_eur_kwh + data.fixed_fee_eur_mo * 12;
        setAnnualCost(Math.round(cost));
      } catch (error) {
        console.error('Error fetching offer:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare l'offerta.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [id, navigate, toast]);

  const handleActivate = () => {
    if (!offer?.redirect_url) {
      toast({
        title: "Link non disponibile",
        description: "Il link all'offerta non è disponibile.",
        variant: "destructive",
      });
      return;
    }

    // Track the click
    supabase.from('leads').insert({
      upload_id: crypto.randomUUID(), // temporary placeholder
      provider: offer.provider,
      offer_id: offer.id,
      redirect_url: offer.redirect_url,
      offer_annual_cost_eur: annualCost,
    });

    window.location.href = offer.redirect_url;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!offer) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna indietro
        </Button>

        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <CardTitle className="text-3xl">
                  {offer.provider}
                </CardTitle>
                <CardDescription className="text-lg">
                  {offer.plan_name}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {offer.is_green && (
                  <Badge variant="secondary" className="gap-1">
                    <Leaf className="h-3 w-3" />
                    Green
                  </Badge>
                )}
                <Badge variant="outline">
                  {offer.pricing_type === 'fixed' ? 'Prezzo fisso' : 'Prezzo indicizzato'}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Annual Cost */}
            <div className="bg-primary/5 rounded-lg p-6 text-center">
              <div className="text-sm text-muted-foreground mb-2">
                Costo annuo stimato (2700 kWh/anno)
              </div>
              <div className="text-4xl font-bold text-primary">
                €{annualCost.toLocaleString('it-IT')}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {offer.is_green && '100% energia rinnovabile'}
              </div>
            </div>

            {/* Pricing Details */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Prezzo energia
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{offer.unit_price_eur_kwh.toFixed(4)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    per kWh
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Euro className="h-4 w-4 text-primary" />
                    Quota fissa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    €{offer.fixed_fee_eur_mo.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    al mese (€{(offer.fixed_fee_eur_mo * 12).toFixed(2)}/anno)
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Info */}
            {offer.area && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Disponibile in zona: {offer.area}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                className="flex-1"
                size="lg"
                onClick={handleActivate}
              >
                Attiva questa offerta
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
              
              {offer.terms_url && (
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                >
                  <a href={offer.terms_url} target="_blank" rel="noopener noreferrer">
                    Termini e condizioni
                  </a>
                </Button>
              )}
            </div>

            {/* Disclaimer */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              Il costo è stimato su un consumo medio di 2700 kWh/anno. 
              I prezzi effettivi possono variare in base al tuo consumo reale e alle condizioni contrattuali.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
