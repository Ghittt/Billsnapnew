import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2 } from 'lucide-react';

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
  aiAnalysis,
  isLoading
}) => {
  
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

  // Simple Markdown Renderer
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-bold mt-6 mb-2 text-purple-900">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold mt-8 mb-3 text-purple-900">{line.replace('## ', '')}</h2>;
      }
      // List items
      if (line.trim().startsWith('- ')) {
         const parts = line.replace('- ', '').split(/(\*\*.*?\*\*)/g);
         return (
          <li key={i} className="ml-4 list-disc mb-1">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </li>
         );
      }
      // Bold
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={i} className="mb-3 leading-relaxed">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <Card className='border-2 border-purple-500/30 bg-purple-50/50'>
      <CardContent className='p-6 md:p-8 space-y-6'>
        <div className='flex items-start gap-3 mb-2'>
          <Sparkles className='h-6 w-6 text-purple-600 mt-1' />
          <div>
            <h2 className='text-2xl md:text-3xl font-bold'>Analisi intelligente</h2>
            <p className='text-lg text-muted-foreground'>Il tuo profilo di consumo</p>
          </div>
        </div>

        <div className='space-y-4 text-base text-foreground leading-relaxed'>
          {aiAnalysis ? (
            <div className="prose prose-purple max-w-none">
              {renderMarkdown(aiAnalysis)}
            </div>
          ) : (
            <p className="text-muted-foreground italic">
              Analisi non disponibile al momento.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
