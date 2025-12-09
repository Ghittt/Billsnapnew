import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { ComparisonTable } from './ComparisonTable';

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
  onActivate?: () => void;
  bestOfferPromo?: string | null;
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
  savingAnnual,
  aiAnalysis,
  isLoading,
  error,
  onActivate,
  bestOfferPromo
}) => {
  
  if (error) {
    return (
      <Card className='border-2 border-red-500/30 bg-red-50/50'>
        <CardContent className='p-6 md:p-8 space-y-6'>
          <div className='flex items-center gap-3 mb-4'>
            <AlertTriangle className='h-6 w-6 text-red-600' />
            <h2 className='text-2xl md:text-3xl font-bold text-red-900'>Analisi non disponibile</h2>
          </div>
          <p className="text-red-700">
            Si è verificato un problema tecnico durante la generazione dell'analisi. 
            Le offerte mostrate qui sotto sono comunque corrette e calcolate sui tuoi consumi.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className='border-2 border-purple-500/30 bg-purple-50/50'>
        <CardContent className='p-6 md:p-8 space-y-6'>
          <div className='flex items-center gap-3 mb-4'>
            <Sparkles className='h-6 w-6 text-purple-600' />
            <h2 className='text-2xl md:text-3xl font-bold text-purple-900'>Analisi intelligente</h2>
          </div>
          <div className='space-y-4 animate-pulse'>
            <div className='h-4 bg-purple-200 rounded w-3/4'></div>
            <div className='h-4 bg-purple-200 rounded w-full'></div>
            <div className='h-4 bg-purple-200 rounded w-5/6'></div>
          </div>
          <div className='flex items-center gap-2 text-sm text-purple-700/70 mt-4'>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span>Generazione analisi personalizzata...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Improved Markdown Renderer
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('#### ')) {
        return <h4 key={i} className="text-lg font-bold mt-6 mb-3 text-purple-800 flex items-center gap-2">{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-bold mt-6 mb-3 text-purple-800">{line.replace('### ', '')}</h3>;
      }
      // Bullet points
      if (line.trim().startsWith('- ')) {
        return <li key={i} className="ml-6 mb-2 text-purple-900/80">{line.replace(/^[\s-]*/, '')}</li>;
      }
      // Empty lines
      if (line.trim() === '') {
        return <div key={i} className="h-2"></div>;
      }
      // Bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-3 leading-relaxed text-purple-900/80">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="text-purple-900 font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. ANALYSIS CARD */}
      <Card className='border-2 border-purple-500/20 bg-gradient-to-br from-purple-50/80 to-white shadow-lg'>
        <CardContent className='p-6 md:p-8 space-y-6'>
          <div className='flex items-start gap-4 mb-4 border-b border-purple-100 pb-4'>
            <div className="p-3 bg-purple-100 rounded-full">
               <Sparkles className='h-6 w-6 text-purple-600' />
            </div>
            <div>
              <h2 className='text-2xl md:text-3xl font-bold text-purple-900'>L'Analisi dell'Esperto</h2>
              <p className='text-lg text-purple-700/80'>Il consiglio su misura per te</p>
            </div>
          </div>

          <div className='space-y-4 text-base text-purple-900 leading-relaxed'>
            {aiAnalysis ? (
              <div className="prose prose-purple max-w-none">
                {renderMarkdown(aiAnalysis)}
              </div>
            ) : (
              <p className="text-purple-900/60 italic">
                Analisi non disponibile al momento.
              </p>
            )}
          </div>

          {/* COMPARISON TABLE - NEW */}
          <ComparisonTable
            currentProvider={currentProvider}
            currentOfferType={currentOfferType}
            currentMonthly={currentMonthly}
            currentAnnual={currentAnnual}
            bestOfferName={bestOfferName}
            bestOfferProvider={bestOfferProvider}
            bestOfferMonthly={bestOfferMonthly}
            bestOfferAnnual={bestOfferAnnual}
            bestOfferPromo={bestOfferPromo}
            savingAnnual={savingAnnual}
            consumption={consumption}
            billType={billType}
          />
        </CardContent>
      </Card>

      {/* 2. CTA CARD (Separated) */}
      {onActivate && aiAnalysis && (
        <Card className="border-2 border-purple-500 bg-purple-50 shadow-xl overflow-hidden">
             <CardContent className="p-0">
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left space-y-2">
                        <h4 className="font-bold text-purple-900 text-2xl">Passa a {bestOfferName}</h4>
                        <p className="text-purple-800 text-lg">
                          Risparmi stimati: <span className="font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(savingAnnual)}/anno</span>
                        </p>
                        <p className="text-sm text-purple-600/80 max-w-md">
                            Offerta selezionata e verificata dai nostri algoritmi per massimizzare il tuo risparmio.
                        </p>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                        <Button 
                            onClick={onActivate} 
                            size="lg"
                            className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-xl px-10 py-8 shadow-lg hover:shadow-xl transition-all hover:scale-105 gap-3"
                        >
                            Attiva Offerta Online <ExternalLink className="h-6 w-6" />
                        </Button>
                        <p className="text-[10px] uppercase tracking-wider text-purple-400 font-medium">
                            Sito Ufficiale {bestOfferProvider}
                        </p>
                    </div>
                </div>
             </CardContent>
        </Card>
      )}
    </div>
  );
};
