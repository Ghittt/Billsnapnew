import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, BarChart3, Zap } from 'lucide-react';

interface ConsumptionAnalysisProps {
  analysis: {
    sintesi: string;
    cosa_capito: string;
    quanto_spendi: string;
    fasce_orarie?: {
      prevalente: string;
      distribuzione: string;
      suggerimento: string;
    } | null;
    risparmio_potenziale: string;
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

      {/* Quanto Spendi + Confronto Nazionale */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">La tua spesa attuale</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.quanto_spendi}</p>
            {analysis.raw_data && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Costo annuo</span>
                  <span className="text-2xl font-bold text-primary">
                    {analysis.raw_data.annual_cost.toFixed(0)} €
                  </span>
                </div>
                {analysis.raw_data.price_unit > 0 && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-muted-foreground">Prezzo unitario</span>
                    <span className="text-sm font-medium">
                      {analysis.raw_data.price_unit.toFixed(3)} €/{analysis.raw_data.unit}
                    </span>
                  </div>
                )}
              </div>
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
          <CardContent>
            <p className="text-sm leading-relaxed">{analysis.risparmio_potenziale}</p>
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
