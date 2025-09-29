import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import SavingsCard from '@/components/results/SavingsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, FileText, Zap, TrendingUp } from 'lucide-react';

const ResultsPage = () => {
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Nuova analisi
            </Button>
            <div className="text-sm text-muted-foreground">
              Analisi completata
            </div>
          </div>

          {/* Main Results */}
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                La tua analisi bolletta
              </h1>
              <p className="text-muted-foreground">
                Abbiamo analizzato la tua bolletta e confrontato le migliori offerte disponibili
              </p>
            </div>

            <SavingsCard
              currentCost={analysisData.currentCost}
              bestOffer={analysisData.bestOffer}
              annualSaving={analysisData.annualSaving}
              copyMessage={analysisData.copyMessage}
            />
          </div>

          {/* Additional Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Dettagli bolletta analizzata
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumo annuo</span>
                  <span className="font-medium">{analysisData.currentConsumption.toLocaleString()} kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prezzo unitario attuale</span>
                  <span className="font-medium">€{analysisData.currentUnitPrice.toFixed(4)}/kWh</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Costo totale annuo</span>
                  <span className="font-medium">€{analysisData.currentCost.toFixed(0)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-success" />
                  Vantaggi del cambio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risparmio mensile</span>
                  <span className="font-medium text-success">€{(analysisData.annualSaving / 12).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Risparmio biennale</span>
                  <span className="font-medium text-success">€{(analysisData.annualSaving * 2).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tempo per il cambio</span>
                  <span className="font-medium">5-10 minuti</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alternative Offers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Altre offerte competitive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { provider: "ENI Plenitude", plan: "Link Luce", saving: 240, unitPrice: 0.221 },
                  { provider: "A2A Energia", plan: "Prezzo Fisso", saving: 195, unitPrice: 0.235 },
                  { provider: "Edison Energia", plan: "Edison Web", saving: 180, unitPrice: 0.238 },
                ].map((offer, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <div className="font-medium">{offer.provider}</div>
                      <div className="text-sm text-muted-foreground">{offer.plan} • €{offer.unitPrice.toFixed(4)}/kWh</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-success">€{offer.saving}/anno</div>
                      <div className="text-sm text-muted-foreground">risparmio</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;