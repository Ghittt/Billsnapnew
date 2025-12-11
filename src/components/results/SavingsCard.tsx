import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getOfferUrl } from '@/utils/offerUrls';
import { useState } from 'react';
import RedirectPopup from './RedirectPopup';

interface SavingsCardProps {
  bestOffer: any;
  currentCost: number;
  billType: 'luce' | 'gas' | 'combo';
  uploadId?: string;
}

export const SavingsCard = ({ bestOffer, currentCost, billType, uploadId }: SavingsCardProps) => {
  const { toast } = useToast();
  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [redirectData, setRedirectData] = useState<{provider: string; offerName: string; url: string} | null>(null);

  const annualSaving = currentCost - bestOffer.simulated_cost;
  const isPositiveSaving = annualSaving > 0;

  const handleActivateOffer = async () => {
    // Use specific offer URL if available, otherwise fallback to provider homepage
    const providerUrl = bestOffer.redirect_url && bestOffer.redirect_url.length > 5
      ? bestOffer.redirect_url
      : getOfferUrl(bestOffer.provider, bestOffer.plan);

    const leadPayload = {
      upload_id: uploadId,
      provider: bestOffer.provider,
      offer_id: bestOffer.id,
      redirect_url: providerUrl,
      offer_annual_cost_eur: bestOffer.simulated_cost,
      annual_saving_eur: annualSaving,
      current_annual_cost_eur: currentCost
    };

    console.log('Sending lead payload:', leadPayload);

    // Save lead (fire and forget)
    const { data, error } = await supabase.functions.invoke('save-lead', {
      body: leadPayload
    });

    if (error) {
      console.error('Error saving lead:', error);
      // We continue anyway, don't block user for tracking error
    } else {
      console.log('Lead saved successfully:', data);
    }
    
    // Show popup
    setRedirectData({
      provider: bestOffer.provider,
      offerName: bestOffer.plan,
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

  return (
    <>
      <Card className="w-full bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-green-900">
              {bestOffer.provider} - {bestOffer.plan}
            </CardTitle>
            {isPositiveSaving && (
              <Badge className="bg-green-600 hover:bg-green-700 text-base px-3 py-1">
                Risparmi {fmt(annualSaving)}/anno
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm mt-3">
              <div className="space-y-1">
                <span className="text-gray-500">Costo attuale stinato</span>
                <p className="font-semibold text-gray-700 line-through decoration-red-500/50">
                  {fmt(currentCost)}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-gray-500">Nuovo costo stimato</span>
                <p className="font-bold text-2xl text-green-700">
                  {fmt(bestOffer.simulated_cost)}
                </p>
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button 
                onClick={handleActivateOffer}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-12 shadow-md transition-all hover:scale-[1.02]"
              >
                Attiva Offerta Online
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <RedirectPopup
        isOpen={showRedirectPopup}
        provider={redirectData?.provider || ''}
        offerName={redirectData?.offerName || ''}
        providerUrl={redirectData?.url || ''}
        onClose={() => setShowRedirectPopup(false)}
      />
    </>
  );
};
