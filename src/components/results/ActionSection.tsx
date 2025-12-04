import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Info } from 'lucide-react';

interface ActionSectionProps {
  hasSavings: boolean;
  savingMonthly: number;
  bestOfferUrl?: string | null;
  bestOfferProvider: string;
  onActivate: () => void;
}

export const ActionSection: React.FC<ActionSectionProps> = ({
  hasSavings,
  savingMonthly,
  bestOfferUrl,
  bestOfferProvider,
  onActivate,
}) => {
  if (hasSavings) {
    return (
      <Card className='border-2'>
        <CardContent className='p-6 md:p-8 space-y-4'>
          <h2 className='text-2xl font-bold'>Cosa ti conviene fare adesso</h2>
          
          <ul className='space-y-2 text-base text-foreground'>
            <li className='flex items-start gap-2'>
              <span className='text-primary mt-1'>•</span>
              <span>Verifica sul sito del fornitore i dettagli contrattuali prima di sottoscrivere.</span>
            </li>
            <li className='flex items-start gap-2'>
              <span className='text-primary mt-1'>•</span>
              <span>Conserva una copia della tua bolletta attuale per confrontare le condizioni.</span>
            </li>
            {savingMonthly >= 5 && (
              <li className='flex items-start gap-2'>
                <span className='text-primary mt-1'>•</span>
                <span>Il risparmio stimato è superiore a 5 €/mese: il cambio ha senso dal punto di vista economico.</span>
              </li>
            )}
          </ul>

          {bestOfferUrl && (
            <Button
              size='lg'
              className='w-full md:w-auto text-lg px-8 py-6'
              onClick={onActivate}
              asChild
            >
              <a href={bestOfferUrl} target='_blank' rel='noopener noreferrer'>
                <ExternalLink className='w-5 h-5 mr-2' />
                Vai all'offerta sul sito di {bestOfferProvider}
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-2 border-blue-500/30 bg-blue-50/50'>
      <CardContent className='p-6 md:p-8 space-y-4'>
        <div className='flex items-center gap-3'>
          <Info className='h-6 w-6 text-blue-600' />
          <h2 className='text-2xl font-bold'>Cosa ti conviene fare adesso</h2>
        </div>
        
        <p className='text-base text-foreground leading-relaxed'>
          In base alle offerte analizzate, non ti consigliamo di cambiare fornitore adesso.
        </p>

        <ul className='space-y-2 text-base text-foreground'>
          <li className='flex items-start gap-2'>
            <span className='text-blue-600 mt-1'>•</span>
            <span>Continua a monitorare le tue bollette nei prossimi mesi.</span>
          </li>
          <li className='flex items-start gap-2'>
            <span className='text-blue-600 mt-1'>•</span>
            <span>Valuta interventi di efficienza energetica in casa (luci LED, elettrodomestici efficienti, termostato intelligente).</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
};
