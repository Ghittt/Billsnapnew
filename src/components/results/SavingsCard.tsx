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
    redirectUrl?: string;
    termsUrl?: string;
    pricingType?: string;
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

      // Use real redirect URL from offer or construct affiliate URL
      const redirectUrl = bestOffer.redirectUrl || 
        `https://fornitore.example/landing?affid=billsnap&provider=${encodeURIComponent(bestOffer.provider)}&plan=${encodeURIComponent(bestOffer.plan)}`;

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

  const handleClick = () => {
    // Track CTA click analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'cta_clicked', {
        'event_category': 'conversion',
        'value': annualSaving
      });
    }
    handleActivateOffer();
  };

  return (
    <div className="text-center space-y-4">
      <Button 
        size="lg" 
        className="w-full md:w-auto min-h-[44px] text-lg font-semibold px-8"
        onClick={handleClick}
        disabled={isLoading || !uploadId}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Reindirizzamento...
          </>
        ) : (
          <>
            <ExternalLink className="w-5 h-5" />
            Attiva subito e risparmia
          </>
        )}
      </Button>
      <p className="text-sm text-muted-foreground">
        Verrai reindirizzato al sito del fornitore per completare il cambio
      </p>
    </div>
  );
};

export default SavingsCard;