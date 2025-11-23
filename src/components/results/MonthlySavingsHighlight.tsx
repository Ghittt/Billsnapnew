import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Wallet, Calendar, Sparkles } from 'lucide-react';

interface MonthlySavingsHighlightProps {
  monthlySaving: number;
  annualSaving: number;
  currentMonthlyCost: number;
  newMonthlyCost: number;
  currentAnnualCost: number;
  newAnnualCost: number;
  realLifeComparison?: string;
}

export const MonthlySavingsHighlight: React.FC<MonthlySavingsHighlightProps> = ({
  monthlySaving,
  annualSaving,
  currentMonthlyCost,
  newMonthlyCost,
  currentAnnualCost,
  newAnnualCost,
  realLifeComparison
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(n);

  const getDefaultComparison = (saving: number) => {
    if (saving >= 80) return "più o meno due pieni di benzina";
    if (saving >= 50) return "circa una spesa al supermercato";
    if (saving >= 30) return "un abbonamento streaming e qualcosa in più";
    if (saving >= 20) return "una pizza con amici";
    return "qualche caffè in più";
  };

  const comparison = realLifeComparison || getDefaultComparison(monthlySaving);

  return (
    <div className="space-y-4">
      {/* Hero Card - Risparmio Mensile */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950/30 dark:to-emerald-900/30 border-green-300 dark:border-green-700">
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          <div>
            <Badge variant="secondary" className="mb-4">
              <Sparkles className="h-3 w-3 mr-1" />
              Risparmio stimato
            </Badge>
            <h2 className="text-5xl md:text-6xl font-bold text-green-700 dark:text-green-400 mb-2">
              {fmt(monthlySaving)}<span className="text-2xl text-muted-foreground">/mese</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              pari a circa <span className="font-semibold text-foreground">{fmt(annualSaving)}</span> all'anno
            </p>
          </div>

          {/* Real Life Comparison */}
          <div className="bg-white/60 dark:bg-black/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <p className="text-base leading-relaxed">
              <span className="font-medium">Nella vita di tutti i giorni: </span>
              {comparison}
            </p>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-200 dark:border-green-800">
            <div className="text-left">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Wallet className="h-4 w-4" />
                Spendi ora
              </div>
              <p className="text-xl font-bold text-foreground">
                {fmt(currentMonthlyCost)}<span className="text-sm text-muted-foreground">/mese</span>
              </p>
              <p className="text-xs text-muted-foreground">
                ({fmt(currentAnnualCost)}/anno)
              </p>
            </div>
            
            <div className="text-left">
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-1">
                <TrendingDown className="h-4 w-4" />
                Spenderesti
              </div>
              <p className="text-xl font-bold text-green-700 dark:text-green-400">
                {fmt(newMonthlyCost)}<span className="text-sm text-muted-foreground">/mese</span>
              </p>
              <p className="text-xs text-muted-foreground">
                ({fmt(newAnnualCost)}/anno)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fine Mese Message */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-2">A fine mese</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {monthlySaving >= 50 ? (
                  <>
                    Questi <span className="font-semibold text-foreground">{fmt(monthlySaving)}</span> al mese 
                    sono un margine fisso che ti resta in tasca ogni mese. Senza cambiare nulla delle tue abitudini, 
                    solo cambiando offerta.
                  </>
                ) : monthlySaving >= 20 ? (
                  <>
                    Sono <span className="font-semibold text-foreground">{fmt(monthlySaving)}</span> al mese che 
                    puoi destinare ad altro. Non è tantissimo, ma è un piccolo respiro in più a fine mese.
                  </>
                ) : (
                  <>
                    Il risparmio è contenuto (<span className="font-semibold text-foreground">{fmt(monthlySaving)}</span> al mese), 
                    ma se la tua offerta attuale sta per scadere o aumentare di prezzo, vale comunque la pena considerare il cambio.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
