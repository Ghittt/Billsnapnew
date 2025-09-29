import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AlternativeOfferCardProps {
  provider: string;
  offerName: string;
  priceKwh: number;
  fixedFeeYear: number;
  annualCost: number;
  source: string;
  onSelect: () => void;
  isLoading?: boolean;
}

export const AlternativeOfferCard: React.FC<AlternativeOfferCardProps> = ({
  provider,
  offerName,
  priceKwh,
  fixedFeeYear,
  annualCost,
  source,
  onSelect,
  isLoading = false
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{provider}</CardTitle>
        <p className="text-sm text-muted-foreground">{offerName}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Price details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prezzo energia</span>
            <span className="font-semibold">{priceKwh.toFixed(4)} €/kWh</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quota fissa</span>
            <span className="font-semibold">{fmt(fixedFeeYear / 12)}/mese</span>
          </div>
        </div>

        {/* Annual cost */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Costo annuo</span>
            <span className="text-xl font-bold">{fmt(annualCost)}</span>
          </div>
        </div>

        {/* Action button */}
        <Button 
          variant="outline"
          className="w-full"
          onClick={onSelect}
          disabled={isLoading}
        >
          <ExternalLink className="w-4 h-4" />
          Vedi offerta
        </Button>

        {/* Source link */}
        <a 
          href={source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary underline block text-center"
        >
          Condizioni ufficiali
        </a>
      </CardContent>
    </Card>
  );
};
