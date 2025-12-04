import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface IntelligentAnalysisProps {
  consumption: number;
  billType: 'luce' | 'gas' | 'combo';
  currentMonthly: number;
  currentAnnual: number;
  currentProvider: string;
  currentOfferType?: string;
  bestOfferName: string;
  bestOfferProvider: string;
  bestOfferMonthly: number;
  bestOfferAnnual: number;
  savingMonthly: number;
  savingAnnual: number;
  aiAnalysis: string | null;
  isLoading: boolean;
  error: boolean;
}

export const IntelligentAnalysis: React.FC<IntelligentAnalysisProps> = ({
  consumption,
  billType,
  currentMonthly,
  currentAnnual,
  currentProvider,
  currentOfferType,
  bestOfferName,
  bestOfferProvider,
  bestOfferMonthly,
  bestOfferAnnual,
  savingMonthly,
  savingAnnual,
  aiAnalysis,
  isLoading,
  error
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);

  const unit = billType === 'gas' ? 'Smc' : 'kWh';
  const hasSavings = savingMonthly > 0;
  const differenceText = hasSavings 
    ? `risparmio di ${fmt(Math.abs(savingMonthly))}/mese`
    : `costo maggiore di ${fmt(Math.abs(savingMonthly))}/mese`;

  // Parse AI Analysis to extract "Analisi Iniziale" (Point 1)
  // Expected format: "1. **Analisi Iniziale**: text..."
  const getProfileAnalysis = () => {
    if (!aiAnalysis) return null;
    
    // Try to find point 1
    const match = aiAnalysis.match(/1\.\s*\*\*.*?\*\*:(.*?)(?=\n2\.|2\.\s)/s);
    if (match && match[1]) {
      return match[1].trim();
    }
    
    // Fallback: just return the first paragraph if structure is missing
    return aiAnalysis.split('\n')[0];
  };

  const profileAnalysis = getProfileAnalysis();

  if (isLoading) {
    return (
      <Card className='border-2 border-purple-500/30 bg-purple-50/50'>
        <CardContent className='p-6 md:p-8 space-y-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Sparkles className='h-6 w-6 text-purple-600' />
            <h2 className='text-2xl md:text-3xl font-bold'>Analisi intelligente</h2>
          </div>
          <div className='space-y-4 animate-pulse'>
            <div className='h-4 bg-purple-200 rounded w-3/4'></div>
            <div className='h-4 bg-purple-200 rounded w-full'></div>
            <div className='h-4 bg-purple-200 rounded w-5/6'></div>
          </div>
          <div className='flex items-center gap-2 text-sm text-muted-foreground mt-4'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>Generazione analisi personalizzata...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className='border-2 border-purple-500/30 bg-purple-50/50'>
        <CardContent className='p-6 md:p-8 space-y-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Sparkles className='h-6 w-6 text-purple-600' />
            <h2 className='text-2xl md:text-3xl font-bold'>Analisi intelligente</h2>
          </div>
          <div className='flex items-start gap-3 text-red-600 bg-red-50 p-4 rounded-lg border border-red-100'>
             <AlertCircle className='h-5 w-5 mt-0.5' />
             <div>
               <p className='font-semibold'>Analisi non disponibile</p>
               <p className='text-sm text-red-700'>C'è stato un problema nel generare il commento automatico. I dati numerici nella parte superiore sono comunque corretti.</p>
             </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-2 border-purple-500/30 bg-purple-50/50'>
      <CardContent className='p-6 md:p-8 space-y-8'>
        <div className='flex items-center gap-3 mb-2'>
          <Sparkles className='h-6 w-6 text-purple-600' />
          <h2 className='text-2xl md:text-3xl font-bold'>Analisi intelligente</h2>
        </div>

        <div className='grid gap-8 md:grid-cols-3'>
          {/* 1. Profilo di consumo */}
          <div className='space-y-2'>
            <h3 className='text-lg font-bold text-purple-900'>Il tuo profilo di consumo</h3>
            <p className='text-base text-foreground leading-relaxed'>
              {profileAnalysis || (
                <>
                  Il tuo consumo annuo è di <span className='font-semibold'>{consumption.toLocaleString('it-IT')} {unit}</span>.
                  Questo dato è fondamentale per capire se stai pagando il giusto prezzo per l'energia che utilizzi.
                </>
              )}
            </p>
          </div>

          {/* 2. Contratto attuale */}
          <div className='space-y-2'>
            <h3 className='text-lg font-bold text-purple-900'>Contratto attuale</h3>
            <p className='text-base text-foreground leading-relaxed'>
              Spendi circa <span className='font-semibold'>{fmt(currentMonthly)}/mese</span> (≈ {fmt(currentAnnual)}/anno) con{' '}
              <span className='font-semibold'>{currentProvider}</span>.
              {currentOfferType && currentOfferType !== 'non specificato' && (
                <> La tua offerta sembra essere di tipo <span className='italic'>{currentOfferType}</span>.</>
              )}
            </p>
          </div>

          {/* 3. Cosa abbiamo trovato */}
          <div className='space-y-2'>
            <h3 className='text-lg font-bold text-purple-900'>Cosa abbiamo trovato per te</h3>
            <div className='text-base text-foreground leading-relaxed'>
              <p className='mb-2'>
                L'offerta migliore è <span className='font-semibold'>{bestOfferName}</span> di{' '}
                <span className='font-semibold'>{bestOfferProvider}</span>.
              </p>
              <ul className='space-y-1 text-sm'>
                <li className='flex justify-between'>
                  <span>Spesa stimata:</span>
                  <span className='font-semibold'>{fmt(bestOfferMonthly)}/mese</span>
                </li>
                <li className='flex justify-between'>
                  <span>Differenza:</span>
                  <span className={`font-semibold ${hasSavings ? 'text-green-600' : 'text-red-600'}`}>
                    {hasSavings ? '-' : '+'}{fmt(Math.abs(savingMonthly))}/mese
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};