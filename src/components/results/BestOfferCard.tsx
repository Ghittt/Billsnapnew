import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BestOfferCardProps {
  provider: string;
  offerName: string;
  priceKwh: number;
  fixedFeeYear: number;
  annualCost: number;
  lastUpdate: string;
  source: string;
  termsUrl?: string;
  onActivate: () => void;
  isLoading?: boolean;
  urlVerified?: boolean;
}

export const BestOfferCard: React.FC<BestOfferCardProps> = ({
  provider,
  offerName,
  priceKwh,
  fixedFeeYear,
  annualCost,
  lastUpdate,
  source,
  termsUrl,
  onActivate,
  isLoading = false,
  urlVerified = undefined
}) => {
  const fmt = (n: number) => new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="text-sm font-medium text-success">Migliore offerta</span>
              </div>
              {urlVerified === true && (
                <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded-full">
                  Link verificato
                </span>
              )}
              {urlVerified === false && (
                <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">
                  Link da verificare
                </span>
              )}
            </div>
            <CardTitle className="text-xl md:text-2xl">{provider}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{offerName}</p>
            {source && source !== '#' && (
              <p className="text-xs text-muted-foreground mt-1">
                🔗 {new URL(source).hostname}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price details grid */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-background/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Prezzo energia</p>
            <p className="text-lg font-bold">{priceKwh.toFixed(4)} €/kWh</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Quota fissa</p>
            <p className="text-lg font-bold">{fmt(fixedFeeYear / 12)}/mese</p>
          </div>
        </div>

        {/* Annual cost highlight */}
        <div className="text-center p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Costo annuo stimato</p>
          <p className="text-3xl font-bold text-primary">{fmt(annualCost)}</p>
        </div>

        {/* CTA Button as direct link */}
        <Button 
          asChild
          size="lg"
          className="w-full text-lg font-semibold"
          disabled={isLoading || !source}
        >
          <a
            href={source || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!source) {
                e.preventDefault();
                return;
              }
              onActivate?.(); // traccia il click/lead
            }}
            aria-label={`Attiva offerta ${provider}`}
          >
            {isLoading ? (
              <>Reindirizzamento...</>
            ) : (
              <>
                <ExternalLink className="w-5 h-5" />
                Attiva subito e risparmia
              </>
            )}
          </a>
        </Button>

        {/* Meta info */}
        <div className="flex flex-col gap-2 text-xs text-muted-foreground pt-2">
          <span>Aggiornato: {new Date(lastUpdate).toLocaleDateString('it-IT')}</span>
          {termsUrl && (
            <a 
              href={termsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary inline-flex items-center gap-1"
            >
              Vedi termini e condizioni <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {source && (
            <a 
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary inline-flex items-center gap-1"
            >
              Fonte ufficiale <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
