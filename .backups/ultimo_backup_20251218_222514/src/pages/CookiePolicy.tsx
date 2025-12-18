import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cookie } from 'lucide-react';

const CookiePolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <Cookie className="w-8 h-8 text-primary" />
              COOKIE POLICY
            </h1>
            <p className="text-foreground font-medium">
              BILL SNAP (VERSIONE TEST)
            </p>
            <p className="text-sm text-muted-foreground">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">1. Tipologie di Cookie Utilizzati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                BillSnap utilizza solo cookie tecnici necessari al funzionamento dell'applicazione, come:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>gestione sessione;</li>
                <li>autenticazione;</li>
                <li>sicurezza.</li>
              </ul>
              <p>Nessun cookie è utilizzato per pubblicità o profilazione.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">2. Cookie di Terze Parti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Durante la fase di test possono essere utilizzati cookie tecnici di terze parti per garantire il funzionamento di componenti essenziali.
                Questi cookie non vengono utilizzati per finalità commerciali, di tracciamento o marketing.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">3. Gestione dei Cookie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                L'utente può disabilitare i cookie tramite le impostazioni del browser, consapevole che ciò potrebbe compromettere il funzionamento della piattaforma.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;
