import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, CheckCircle } from 'lucide-react';

interface SummaryBannerProps {
  hasSavings: boolean;
  monthlySaving: number;
  yearlySaving: number;
  bestOfferName: string;
  bestOfferProvider: string;
  currentProvider: string;
}

export const SummaryBanner: React.FC<SummaryBannerProps> = ({
  hasSavings,
  monthlySaving,
  yearlySaving,
  bestOfferName,
  bestOfferProvider,
  currentProvider,
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);

  if (hasSavings) {
    return (
      <Card className='border-2 border-green-500/30 bg-green-50/50'>
        <CardContent className='p-6 md:p-8'>
          <div className='flex items-start gap-4'>
            <TrendingDown className='h-8 w-8 text-green-600 flex-shrink-0 mt-1' />
            <div>
              <h3 className='text-xl md:text-2xl font-bold mb-2'>Hai margine di risparmio</h3>
              <p className='text-base text-foreground leading-relaxed'>
                Con l'offerta <span className='font-semibold'>{bestOfferName}</span> di{' '}
                <span className='font-semibold'>{bestOfferProvider}</span> potresti risparmiare circa{' '}
                <span className='font-bold text-green-600'>{fmt(monthlySaving)}/mese</span>{' '}
                (≈ {fmt(yearlySaving)}/anno).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-2 border-blue-500/30 bg-blue-50/50'>
      <CardContent className='p-6 md:p-8'>
        <div className='flex items-start gap-4'>
          <CheckCircle className='h-8 w-8 text-blue-600 flex-shrink-0 mt-1' />
          <div>
            <h3 className='text-xl md:text-2xl font-bold mb-2'>In questo momento la tua tariffa è competitiva</h3>
            <p className='text-base text-foreground leading-relaxed'>
              Le offerte che abbiamo analizzato non migliorano la tua spesa attuale. Restare con{' '}
              <span className='font-semibold'>{currentProvider}</span> è una scelta ragionevole.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
