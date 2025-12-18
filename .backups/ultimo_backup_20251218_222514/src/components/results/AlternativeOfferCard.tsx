import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProviderLogo } from './ProviderLogo';

interface AlternativeOfferCardProps {
  provider: string;
  offerName: string;
  priceKwh: number;
  fixedFeeMonth: number;
  annualCost: number;
  source: string;
  onSelect: () => void;
  isLoading?: boolean;
  urlVerified?: boolean;
  explanation?: {
    headline: string;
    in_breve: string;
    perche_per_te: string;
    cosa_non_fare: string;
    numeri_chiari: string;
    prossimo_passo: string;
  };
}

export const AlternativeOfferCard: React.FC<AlternativeOfferCardProps> = ({
  provider,
  offerName,
  priceKwh,
  fixedFeeMonth,
  annualCost,
  source,
  onSelect,
  isLoading = false,
  urlVerified = undefined,
  explanation
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
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ProviderLogo provider={provider} size='sm' />
              <div>
                <CardTitle className="text-lg">{provider}</CardTitle>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{offerName}</p>
            {source && source !== '#' && (() => {
              try {
                return <p className="text-xs text-muted-foreground mt-1">🔗 {new URL(source).hostname}</p>;
              } catch {
                return null;
              }
            })()}
          </div>
          {urlVerified === true && (
            <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full whitespace-nowrap">
              Verificato
            </span>
          )}
        </div>
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
            <span className="font-semibold">{fmt(fixedFeeMonth)}/mese</span>
          </div>
        </div>

        {/* Annual cost */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Costo annuo</span>
            <span className="text-xl font-bold">{fmt(annualCost)}</span>
          </div>
        </div>

        {/* AI Explanation - Always-On 5 Blocks */}
        {explanation && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg text-xs">
            <p className="font-semibold text-foreground text-sm">{explanation.headline}</p>
            <div className="space-y-1.5">
              <div>
                <span className="font-medium text-foreground">In breve:</span>{' '}
                <span className="text-muted-foreground">{explanation.in_breve}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Perché per te:</span>{' '}
                <span className="text-muted-foreground">{explanation.perche_per_te}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Numeri chiari:</span>{' '}
                <span className="text-muted-foreground">{explanation.numeri_chiari}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action button - anchor to avoid popup blockers */}
        <Button
          asChild
          variant="default"
          className="w-full"
          disabled={isLoading}
        >
          <a
            href={source || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!source) {
                e.preventDefault();
              }
              onSelect?.();
            }}
            aria-label={`Vedi offerta ${provider}`}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            🔗 Vedi offerta
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};
