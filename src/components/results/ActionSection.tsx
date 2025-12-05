import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface ActionSectionProps {
  hasSavings: boolean;
  savingMonthly: number;
  bestOfferName: string;
  bestOfferProvider: string;
  bestOfferProviderName: string; // kept for compatibility
  bestOfferUrl: string | null;
  onActivate: () => void;
}

export const ActionSection: React.FC<ActionSectionProps> = ({
  hasSavings,
  bestOfferName,
  bestOfferProvider,
  bestOfferUrl,
  onActivate
}) => {
  if (!hasSavings) return null;

  return (
    <Card className='border-2 bg-white'>
      <CardContent className='p-6 md:p-8 space-y-6'>
        <h2 className='text-2xl md:text-3xl font-bold text-center'>Cosa ti conviene fare adesso</h2>
        
        <ol className='list-decimal list-outside pl-5 space-y-4 text-lg text-foreground'>
          <li>
            Apri l'offerta <strong>{bestOfferName}</strong> di <strong>{bestOfferProvider}</strong> con il pulsante qui sotto.
          </li>
          <li>
            Verifica che i dati principali coincidano con questa analisi: prezzo energia, costi fissi, eventuali bonus.
          </li>
          <li>
            Controlla due soli punti del contratto: penali di uscita (devono essere nulle o minime) e durata del prezzo bloccato.
          </li>
          <li>
            Se tutto è allineato, il cambio ha senso: con i tuoi consumi il risparmio stimato è reale e sostenuto.
          </li>
        </ol>

        <div className='pt-6 text-center'>
          <Button 
            size='lg' 
            className='w-full md:w-auto px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all'
            onClick={() => {
              onActivate();
              if (bestOfferUrl) window.open(bestOfferUrl, '_blank');
            }}
          >
            Vai all'offerta e sottoscrivi
            <ExternalLink className='ml-2 h-5 w-5' />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
