import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Termini di Servizio
            </h1>
            <p className="text-foreground">
              Condizioni d'uso del servizio BillSnap
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Servizio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                BillSnap è un servizio di analisi bollette energetiche che permette di:
              </p>
              <ul className="space-y-2 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Analizzare bollette energetiche tramite OCR</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Calcolare potenziali risparmi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Raccomandare offerte competitive</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Utilizzo Accettabile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">Utilizzando BillSnap, accetti di:</p>
              <ul className="space-y-2 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Fornire dati accurati e veritieri</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Non utilizzare il servizio per scopi illegali</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Rispettare i diritti di proprietà intellettuale</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Limitazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-foreground">
                BillSnap fornisce stime basate sui dati disponibili. 
                I risparmi effettivi possono variare e dipendono da fattori esterni.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Contatti</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground">
                Per supporto: <a href="mailto:support@billsnap.app" className="text-primary underline font-medium">support@billsnap.app</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
