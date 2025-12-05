import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface SummaryBannerProps {
  hasSavings: boolean;
  monthlySaving: number;
  yearlySaving: number;
  bestOfferName: string;
  bestOfferProvider: string;
  currentProvider: string;
  bestOfferUrl: string | null;
  onActivate: () => void;
  currentMonthly?: number;
  newMonthly?: number;
}

export const SummaryBanner: React.FC<SummaryBannerProps> = ({
  hasSavings,
  monthlySaving,
  yearlySaving,
  bestOfferName,
  bestOfferProvider,
  currentProvider,
  currentMonthly = 0,
  newMonthly = 0
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);

  let bgColor = 'bg-green-50 border-green-200';
  let textColor = 'text-green-800';
  let icon = <CheckCircle2 className='h-6 w-6 text-green-600' />;
  let savingLevel = "moderato";

  if (monthlySaving >= 15) {
    savingLevel = "molto alto";
  } else if (monthlySaving >= 5) {
    savingLevel = "alto";
  } else if (monthlySaving > 0) {
    savingLevel = "basso";
  } else {
    bgColor = 'bg-blue-50 border-blue-200';
    textColor = 'text-blue-800';
    icon = <AlertCircle className='h-6 w-6 text-blue-600' />;
  }

  if (!hasSavings) {
    return (
      <Card className={`${bgColor} border-2`}>
        <CardContent className='p-6 md:p-8 flex items-start gap-4'>
          <div className='mt-1'>{icon}</div>
          <div className='space-y-2'>
            <h3 className={`text-xl font-bold ${textColor}`}>Sei già messo bene</h3>
            <p className='text-base text-foreground/80'>
              Non abbiamo trovato offerte significativamente migliori della tua attuale con {currentProvider}. 
              Ti consigliamo di mantenere il tuo contratto attuale.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${bgColor} border-2`}>
      <CardContent className='p-6 md:p-8 space-y-4'>
        <div className='flex items-center gap-3'>
          {icon}
          <h3 className={`text-2xl font-bold ${textColor}`}>Hai margine di risparmio</h3>
        </div>
        
        <p className='text-lg leading-relaxed text-foreground'>
          Con l'offerta <strong>{bestOfferName}</strong> di <strong>{bestOfferProvider}</strong> potresti spendere circa <strong>{fmt(newMonthly)}/mese</strong> invece di <strong>{fmt(currentMonthly)}/mese</strong>.
          <br />
          Il risparmio stimato è di circa <strong>{fmt(monthlySaving)}/mese</strong> (≈ {fmt(yearlySaving)}/anno).
          <br />
          Per un profilo come il tuo si tratta di un risparmio <strong>{savingLevel}</strong>.
        </p>

        <p className='text-sm text-muted-foreground pt-2'>
          Il calcolo è fatto sui tuoi consumi reali: non è una stima generica, ma basata sulla tua bolletta.
        </p>
      </CardContent>
    </Card>
  );
};
