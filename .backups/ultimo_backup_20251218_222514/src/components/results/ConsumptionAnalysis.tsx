import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, BarChart3, Zap } from 'lucide-react';

interface ConsumptionAnalysisProps {
  analysis: {
    sintesi: string;
    cosa_capito: string;
    spesa_mensile_attuale?: {
      importo_mese: number;
      importo_anno: number;
      messaggio: string;
    };
    quanto_spendi: string;
    fasce_orarie?: {
      prevalente: string;
      distribuzione: string;
      suggerimento: string;
      impatto_mensile?: string;
    } | null;
    risparmio_potenziale: string | {
      mensile: string;
      annuale: string;
      vita_reale: string;
      messaggio_completo: string;
    };
    consiglio_pratico: string;
    confronto_nazionale: {
      messaggio: string;
    };
    anomalie: Array<{
      tipo: string;
      severita: string;
      messaggio: string;
    }>;
    conclusione: string;
    raw_data?: {
      consumption: number;
      unit: string;
      annual_cost: number;
      price_unit: number;
      national_average: number;
      diff_percentage: string;
      fasce?: any;
    };
  };
}

export const ConsumptionAnalysis: React.FC<ConsumptionAnalysisProps> = ({ analysis }) => {
  const isAboveAverage = analysis.raw_data 
    ? analysis.raw_data.consumption > analysis.raw_data.national_average 
    : false;

  const getSeverityIcon = (severita: string) => {
    switch (severita) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Lightbulb className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sintesi Principale */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analisi dei tuoi consumi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-lg font-medium leading-relaxed">{analysis.sintesi}</p>
          
          {/* Cosa ho capito */}
          <div className="pt-4 border-t border-border/50">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Cosa ho capito dalla tua bolletta
            </h4>
            <p className="text-muted-foreground leading-relaxed">{analysis.cosa_capito}</p>
          </div>
        </CardContent>
      </Card>

      {/* Spesa Mensile Attuale (principale) + Confronto Nazionale */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-900/20">
          <CardHeader>
            <CardTitle className="text-base">Quanto spendi ora</CardTitle>
          </CardHeader>
          <CardContent>
            {analysis.spesa_mensile_attuale ? (
              <>
                <div className="mb-4">
                  <div className="text-4xl font-bold text-orange-700 dark:text-orange-400">
                    {analysis.spesa_mensile_attuale.importo_mese} €
                    <span className="text-lg text-muted-foreground">/mese</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    (circa {analysis.spesa_mensile_attuale.importo_anno} € all'anno)
                  </p>
                </div>
                <p className="text-sm leading-relaxed">
                  {analysis.spesa_mensile_attuale.messaggio}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm leading-relaxed mb-4">{analysis.quanto_spendi}</p>
                {analysis.raw_data && (
                  <div className="p-3 bg-white/60 dark:bg-black/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="mb-3">
                      <span className="text-sm text-muted-foreground">Al mese</span>
                      <div className="text-3xl font-bold text-orange-700 dark:text-orange-400">
                        {(analysis.raw_data.annual_cost / 12).toFixed(0)} €
                      </div>
                    </div>
                    <div className="pt-2 border-t border-orange-200 dark:border-orange-800">
                      <span className="text-xs text-muted-foreground">All'anno: </span>
                      <span className="text-sm font-medium">
                        {analysis.raw_data.annual_cost.toFixed(0)} €
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {isAboveAverage ? (
                <TrendingUp className="h-4 w-4 text-orange-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              Confronto con media nazionale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.confronto_nazionale.messaggio}</p>
            {analysis.raw_data && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Il tuo consumo</span>
                  <span className="font-bold">
                    {analysis.raw_data.consumption} {analysis.raw_data.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-muted-foreground">Media nazionale</span>
                  <span className="font-medium">
                    {analysis.raw_data.national_average} {analysis.raw_data.unit}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border/50">
                  <Badge variant={isAboveAverage ? "secondary" : "default"} className="w-full justify-center">
                    {isAboveAverage ? '+' : ''}{analysis.raw_data.diff_percentage}% vs media
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Fasce Orarie (solo per luce) */}
      {analysis.fasce_orarie && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuzione consumi per fascia oraria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Fascia prevalente: <span className="text-primary">{analysis.fasce_orarie.prevalente}</span></p>
              <p className="text-sm text-muted-foreground">{analysis.fasce_orarie.distribuzione}</p>
              {analysis.fasce_orarie.impatto_mensile && (
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mt-2">
                  💰 {analysis.fasce_orarie.impatto_mensile}
                </p>
              )}
            </div>
            <Alert>
              <Lightbulb className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {analysis.fasce_orarie.suggerimento}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Anomalie */}
      {analysis.anomalie && analysis.anomalie.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Cosa ho notato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.anomalie.map((anomalia, index) => (
              <Alert key={index} variant={anomalia.severita === 'warning' ? 'destructive' : 'default'}>
                {getSeverityIcon(anomalia.severita)}
                <AlertDescription className="text-sm">
                  {anomalia.messaggio}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Risparmio Potenziale + Consiglio Pratico */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200">
          <CardHeader>
            <CardTitle className="text-base">Risparmio potenziale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {typeof analysis.risparmio_potenziale === 'object' ? (
              <>
                <div>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                    {analysis.risparmio_potenziale.mensile}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ({analysis.risparmio_potenziale.annuale})
                  </p>
                </div>
                <p className="text-sm leading-relaxed font-medium">
                  {analysis.risparmio_potenziale.vita_reale}
                </p>
                <p className="text-sm text-muted-foreground pt-2 border-t border-green-200 dark:border-green-800">
                  {analysis.risparmio_potenziale.messaggio_completo}
                </p>
              </>
            ) : (
              <p className="text-sm leading-relaxed">{analysis.risparmio_potenziale}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Consiglio pratico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed font-medium">{analysis.consiglio_pratico}</p>
          </CardContent>
        </Card>
      </div>

      {/* Conclusione */}
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground italic">{analysis.conclusione}</p>
      </div>
    </div>
  );
};
