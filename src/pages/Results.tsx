import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import SavingsCard from '@/components/results/SavingsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Zap, TrendingUp } from 'lucide-react';
import '@/types/analytics';

const ResultsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const uploadId = searchParams.get('uploadId');

  // Mock data - in real app this would come from OCR + AI analysis
  const analysisData = {
    currentCost: 1680,
    currentConsumption: 3500, // kWh/year
    currentUnitPrice: 0.25,
    bestOffer: {
      provider: "Enel Energia",
      plan: "E-Light Luce",
      annualCost: 1420,
      unitPrice: 0.22,
    },
    annualSaving: 260,
    copyMessage: "Ti ho trovato un'offerta che ti fa risparmiare 260 €/anno rispetto alla tua bolletta attuale."
  };

  // Show different message based on savings amount
  const getSavingsMessage = () => {
    if (analysisData.annualSaving < 50) {
      return "La tua offerta è già tra le migliori. Risparmio potenziale minimo (€30/anno).";
    }
    return `Ti ho trovato un'offerta che ti fa risparmiare €${analysisData.annualSaving}/anno rispetto alla tua bolletta attuale.`;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm md:text-base"
            >
              <ArrowLeft className="w-4 h-4" />
              Nuova analisi
            </Button>
          </div>

          {/* Essential 3-block layout */}
          <div className="space-y-6">
            
            {/* AI Message with clear savings communication */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-primary mb-4">
                <Zap className="w-6 h-6" />
                <span className="font-medium">Analisi completata</span>
              </div>
              <p className="text-lg md:text-xl text-foreground font-medium max-w-2xl mx-auto">
                {getSavingsMessage()}
              </p>
            </div>

            {/* 3 Fixed Blocks: Current Cost | Best Offer | Annual Savings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              
              {/* Block 1: Current Annual Cost */}
              <Card className="text-center p-4 md:p-6">
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Costo attuale</p>
                  <p className="text-2xl md:text-3xl font-bold text-foreground">
                    €{analysisData.currentCost}
                  </p>
                  <p className="text-xs text-muted-foreground">all'anno</p>
                </CardContent>
              </Card>
              
              {/* Block 2: Best Offer Annual Cost */}
              <Card className="text-center p-4 md:p-6 border-primary/20 bg-primary/5">
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Miglior offerta</p>
                  <p className="text-2xl md:text-3xl font-bold text-primary">
                    €{analysisData.bestOffer.annualCost}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {analysisData.bestOffer.provider} - {analysisData.bestOffer.plan}
                  </p>
                </CardContent>
              </Card>
              
              {/* Block 3: Annual Savings (Big & Green) */}
              <Card className="text-center p-4 md:p-6 border-success/30 bg-success/10">
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Risparmio</p>
                  <p className="text-3xl md:text-4xl font-bold text-success">
                    €{analysisData.annualSaving}
                  </p>
                  <p className="text-xs text-muted-foreground">all'anno</p>
                </CardContent>
              </Card>
            </div>

            {/* Single CTA */}
            <div className="text-center space-y-4">
              <SavingsCard
                currentCost={analysisData.currentCost}
                bestOffer={{
                  ...analysisData.bestOffer,
                  id: "enel-e-light-luce"
                }}
                annualSaving={analysisData.annualSaving}
                copyMessage=""
                uploadId={uploadId || undefined}
              />
            </div>
          </div>

          {/* Minimal additional details - collapsed on mobile */}
          <details className="space-y-4">
            <summary className="cursor-pointer text-center text-sm text-muted-foreground hover:text-primary">
              Vedi dettagli completi
            </summary>
            
            <div className="grid md:grid-cols-2 gap-4 md:gap-6 mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Dettagli bolletta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consumo annuo</span>
                    <span className="font-medium">{analysisData.currentConsumption.toLocaleString()} kWh</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Prezzo unitario</span>
                    <span className="font-medium">€{analysisData.currentUnitPrice.toFixed(4)}/kWh</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-success" />
                    Vantaggi del cambio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risparmio mensile</span>
                    <span className="font-medium text-success">€{(analysisData.annualSaving / 12).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tempo per il cambio</span>
                    <span className="font-medium">5-10 minuti</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </details>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:hidden">
        <Button 
          className="w-full h-12 text-lg font-semibold"
          onClick={() => {
            // Same CTA action as SavingsCard
            if (typeof gtag !== 'undefined') {
              gtag('event', 'cta_clicked', {
                'event_category': 'conversion',
                'value': analysisData.annualSaving
              });
            }
          }}
        >
          Attiva subito e risparmia €{analysisData.annualSaving}
        </Button>
      </div>
    </div>
  );
};

export default ResultsPage;