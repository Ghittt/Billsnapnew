import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, Euro, Zap, ExternalLink } from 'lucide-react';

interface SavingsCardProps {
  currentCost: number;
  bestOffer: {
    provider: string;
    plan: string;
    annualCost: number;
    unitPrice: number;
  };
  annualSaving: number;
  copyMessage?: string;
}

const SavingsCard: React.FC<SavingsCardProps> = ({
  currentCost,
  bestOffer,
  annualSaving,
  copyMessage
}) => {
  const savingPercentage = ((annualSaving / currentCost) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Main Comparison */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Current Cost */}
        <Card className="border-muted">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground">Costo Attuale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              €{currentCost.toFixed(0)}/anno
            </div>
          </CardContent>
        </Card>

        {/* Best Offer */}
        <Card className="border-primary shadow-medium">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-primary">Miglior Offerta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-foreground">
                €{bestOffer.annualCost.toFixed(0)}/anno
              </div>
              <div className="text-sm text-muted-foreground">
                {bestOffer.provider} • {bestOffer.plan}
              </div>
              <div className="text-xs text-muted-foreground">
                €{bestOffer.unitPrice.toFixed(4)}/kWh
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings */}
        <Card className="border-success bg-gradient-subtle">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-success flex items-center gap-1">
              <TrendingDown className="w-4 h-4" />
              Risparmio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-success">
                €{annualSaving.toFixed(0)}
              </div>
              <div className="text-sm text-success">
                -{savingPercentage}% all'anno
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Message */}
      {copyMessage && (
        <Card className="bg-gradient-savings border-success">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-success-foreground" />
              </div>
              <p className="text-primary-foreground font-medium leading-relaxed">
                {copyMessage}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <div className="text-center space-y-4">
        <Button variant="cta" size="lg" className="w-full sm:w-auto">
          <Euro className="w-5 h-5" />
          Attiva questa offerta
          <ExternalLink className="w-4 h-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          Verrai reindirizzato al sito del fornitore per completare il cambio
        </p>
      </div>
    </div>
  );
};

export default SavingsCard;