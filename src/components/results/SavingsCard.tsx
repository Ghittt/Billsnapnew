import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, Euro, Zap, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SavingsCardProps {
  currentCost: number;
  bestOffer: {
    provider: string;
    plan: string;
    annualCost: number;
    unitPrice: number;
    id?: string;
  };
  annualSaving: number;
  copyMessage?: string;
  uploadId?: string;
}

const SavingsCard: React.FC<SavingsCardProps> = ({
  currentCost,
  bestOffer,
  annualSaving,
  copyMessage,
  uploadId
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const savingPercentage = ((annualSaving / currentCost) * 100).toFixed(1);

  const handleActivateOffer = async () => {
    if (!uploadId) {
      toast({
        title: "Errore",
        description: "Dati di sessione mancanti. Riprova caricando nuovamente la bolletta.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Detect device type
      const userAgent = navigator.userAgent.toLowerCase();
      let device = 'web';
      if (userAgent.includes('mobile') || userAgent.includes('android')) device = 'mobile';
      if (userAgent.includes('iphone') || userAgent.includes('ipad')) device = 'ios';

      // Extract UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const utmSource = urlParams.get('utm_source') || undefined;
      const utmMedium = urlParams.get('utm_medium') || undefined;
      const utmCampaign = urlParams.get('utm_campaign') || undefined;

      // Sample redirect URL - in real implementation this would come from offer data
      const redirectUrl = `https://fornitore.example/landing?affid=billsnap&provider=${encodeURIComponent(bestOffer.provider)}`;

      const leadPayload = {
        upload_id: uploadId,
        offer_id: bestOffer.id || `${bestOffer.provider}-${bestOffer.plan}`.replace(/\s+/g, '-').toLowerCase(),
        provider: bestOffer.provider,
        annual_saving_eur: annualSaving,
        current_annual_cost_eur: currentCost,
        offer_annual_cost_eur: bestOffer.annualCost,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        device: device,
        redirect_url: redirectUrl
      };

      console.log('Sending lead payload:', leadPayload);

      const { data, error } = await supabase.functions.invoke('save-lead', {
        body: leadPayload
      });

      if (error) {
        console.error('Error saving lead:', error);
        toast({
          title: "Errore temporaneo",
          description: "Non riesco ad aprire la pagina del fornitore, riprova",
          variant: "destructive"
        });
        return;
      }

      console.log('Lead saved successfully:', data);
      
      // Redirect to provider
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        toast({
          title: "Errore",
          description: "URL di redirect non disponibile",
          variant: "destructive"
        });
      }

    } catch (error) {
      console.error('Error in handleActivateOffer:', error);
      toast({
        title: "Errore temporaneo",
        description: "Non riesco ad aprire la pagina del fornitore, riprova",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Current Cost */}
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Costo Attuale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              €{currentCost.toFixed(0)}/anno
            </div>
          </CardContent>
        </Card>

        {/* Best Offer */}
        <Card className="border-primary shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">Miglior Offerta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground">
                €{bestOffer.annualCost.toFixed(0)}/anno
              </div>
              <div className="text-sm text-muted-foreground">
                {bestOffer.provider} • {bestOffer.plan}
              </div>
              <div className="text-xs text-muted-foreground">
                €{bestOffer.unitPrice.toFixed(4)}/kWh
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings */}
        <Card className="border-success bg-gradient-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-success flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              Risparmio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-success">
                €{annualSaving.toFixed(0)}
              </div>
              <div className="text-sm text-success">
                -{savingPercentage}% all'anno
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Message */}
      {copyMessage && (
        <Card className="bg-gradient-savings border-success">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-success-foreground" />
              </div>
              <p className="text-primary-foreground font-medium leading-relaxed">
                {copyMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <div className="text-center space-y-4">
        <Button 
          variant="cta" 
          size="lg" 
          className="w-full sm:w-auto"
          onClick={handleActivateOffer}
          disabled={isLoading || !uploadId}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Reindirizzamento...
            </>
          ) : (
            <>
              <Euro className="w-5 h-5" />
              Attiva questa offerta
              <ExternalLink className="w-4 h-4" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground">
          Verrai reindirizzato al sito del fornitore per completare il cambio
        </p>
      </div>
    </div>
  );
};

export default SavingsCard;