import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

const DisclaimerPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <AlertTriangle className="w-8 h-8 text-primary" />
              DISCLAIMER LEGALE
            </h1>
            <p className="text-foreground font-medium">
              SPECIFICO PER PROGETTI AI IN FASE DI TEST
            </p>
          </div>

          <Card className="border-primary/20">
            <CardContent className="space-y-4 text-foreground pt-6">
              <p className="font-medium text-lg">
                BillSnap è un progetto di sperimentazione AI.
              </p>
              <p>
                Gli output generati (analisi di consumo, suggerimenti di risparmio, consigli energetici) sono stati preliminari e non certificati.
              </p>
              <p>Non sostituiscono:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>consulenti energetici;</li>
                <li>esperti fiscali;</li>
                <li>operatori del settore.</li>
              </ul>
              <p className="font-bold mt-4">
                Ogni decisione presa dall'utente resta sotto sua esclusiva responsabilità.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerPage;
