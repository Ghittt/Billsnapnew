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
              PROGETTO AI IN FASE DI TEST
            </p>
          </div>

          <Card className="border-primary/20">
            <CardContent className="space-y-4 text-foreground pt-6">
              <p>
                BillSnap fornisce risultati generati automaticamente a scopo sperimentale.
              </p>
              <p>
                Le informazioni non costituiscono consulenza energetica, tecnica o finanziaria.
              </p>
              <p>
                Qualsiasi decisione presa sulla base degli output generati resta sotto esclusiva responsabilità dell'utente.
              </p>
              <p>
                Il progetto non rappresenta un servizio professionale né commerciale.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DisclaimerPage;
