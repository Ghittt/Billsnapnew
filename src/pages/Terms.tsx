import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-foreground flex items-center justify-center gap-2">
              <FileText className="w-8 h-8 text-primary" />
              Termini di Servizio
            </h1>
            <p className="text-muted-foreground">
              Condizioni d'uso del servizio BillSnap
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Servizio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                BillSnap è un servizio di analisi bollette energetiche che permette di:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Analizzare bollette energetiche tramite OCR</li>
                <li>Calcolare potenziali risparmi</li>
                <li>Raccomandare offerte competitive</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Utilizzo Accettabile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Utilizzando BillSnap, accetti di:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>Fornire dati accurati e veritieri</li>
                <li>Non utilizzare il servizio per scopi illegali</li>
                <li>Rispettare i diritti di proprietà intellettuale</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Limitazioni</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                BillSnap fornisce stime basate sui dati disponibili. 
                I risparmi effettivi possono variare e dipendono da fattori esterni.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contatti</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Per supporto: <a href="mailto:support@billsnap.app" className="text-primary underline">support@billsnap.app</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;