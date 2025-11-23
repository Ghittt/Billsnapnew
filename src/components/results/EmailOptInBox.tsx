import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EmailOptInBoxProps {
  uploadId?: string;
  ocrData?: any;
  bestOffer?: any;
  currentCost?: number;
}

export const EmailOptInBox: React.FC<EmailOptInBoxProps> = ({ 
  uploadId, 
  ocrData, 
  bestOffer,
  currentCost 
}) => {
  const [email, setEmail] = useState('');
  const [notificationsOptIn, setNotificationsOptIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveData = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Email non valida',
        description: 'Inserisci un indirizzo email valido',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    
    try {
      // Calculate predicted savings
      const predictedSavings = currentCost && bestOffer?.offer_annual_cost_eur 
        ? currentCost - bestOffer.offer_annual_cost_eur 
        : 0;

      // Prepare data for save-anonymous-bill function
      const billData = {
        email,
        notifications_opt_in: notificationsOptIn,
        raw_data: ocrData || {},
        ai_output: {
          best_offer: bestOffer,
          upload_id: uploadId
        },
        provider: ocrData?.provider || null,
        price: ocrData?.unit_price_eur_kwh || null,
        kwh: ocrData?.annual_kwh || null,
        m3: ocrData?.consumo_annuo_smc || null,
        predicted_savings: predictedSavings > 0 ? predictedSavings : null
      };

      const { data, error } = await supabase.functions.invoke('save-anonymous-bill', {
        body: billData
      });

      if (error) throw error;

      // Invia email di conferma
      await supabase.functions.invoke('send-confirmation-email', {
        body: { email, notifications_opt_in: notificationsOptIn }
      });

      setSaved(true);
      toast({
        title: 'Dati salvati!',
        description: notificationsOptIn 
          ? 'Ti avviseremo quando troveremo offerte migliori' 
          : 'I tuoi dati sono stati salvati correttamente'
      });

    } catch (error) {
      console.error('Error saving data:', error);
      toast({
        title: 'Errore',
        description: 'Impossibile salvare i dati. Riprova.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (saved) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="text-center space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">
              {notificationsOptIn 
                ? '✓ Ti avviseremo quando troveremo offerte migliori' 
                : '✓ Dati salvati correttamente'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Vuoi ricevere offerte migliori?
        </CardTitle>
        <CardDescription>
          Inserisci la tua email e ti avviseremo quando troveremo tariffe più convenienti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="tua@email.it"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSaving}
          />
        </div>

        <div className="flex items-start space-x-2">
          <Checkbox
            id="notifications"
            checked={notificationsOptIn}
            onCheckedChange={(checked) => setNotificationsOptIn(checked as boolean)}
            disabled={isSaving}
          />
          <label
            htmlFor="notifications"
            className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Voglio ricevere notifiche sulle offerte migliori e sul gruppo acquisto
          </label>
        </div>

        <Button 
          onClick={handleSaveData} 
          disabled={isSaving || !email}
          className="w-full"
        >
          {isSaving ? 'Salvataggio...' : 'Salva e ricevi aggiornamenti'}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Non fornendo la tua email, i tuoi dati non verranno salvati
        </p>
      </CardContent>
    </Card>
  );
};