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
              <CardTitle className="text-primary">1. Tipologie di Cookie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>BillSnap utilizza esclusivamente:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>cookie tecnici essenziali;</li>
                <li>cookie per funzionamento del sistema (sessione, login).</li>
              </ul>
              <p>Non vengono usati cookie:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>di marketing;</li>
                <li>di tracciamento;</li>
                <li>di profilazione;</li>
                <li>di advertising.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">2. Finalità dei Cookie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>I cookie servono solo per:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>mantenere la sessione utente;</li>
                <li>gestire l'accesso a funzionalità di test.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">3. Cookie di Terze Parti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>In fase di test possono essere presenti cookie tecnici dei provider:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Supabase (autenticazione);</li>
                <li>OpenAI / Gemini (API tecniche);</li>
                <li>Lovable / Antigravity (ambiente di sviluppo).</li>
              </ul>
              <p>Nessuno di essi è utilizzato per profilazione commerciale.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">4. Gestione Cookie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                L'utente può disabilitare i cookie tramite il proprio browser, consapevole che la piattaforma potrebbe non funzionare correttamente.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;
