import Header from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const PrivacyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              INFORMATIVA PRIVACY
            </h1>
            <p className="text-foreground font-medium">
              BILL SNAP (VERSIONE TEST / SENZA SOCIETÀ / NO LUCRO)
            </p>
            <p className="text-sm text-muted-foreground">
              Ultimo aggiornamento: {new Date().toLocaleDateString('it-IT')}
            </p>
          </div>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">1. Premessa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                BillSnap è un progetto sperimentale non commerciale.
                Non esiste un soggetto societario attivo: il trattamento dei dati è effettuato dal creatore del progetto a titolo personale, esclusivamente per finalità tecniche e di sperimentazione.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">2. Tipologia di Dati Trattati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>I dati trattati possono includere:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>immagini o PDF delle bollette;</li>
                <li>dati relativi ai consumi;</li>
                <li>informazioni inserite volontariamente dall'utente;</li>
                <li>dati tecnici di utilizzo.</li>
              </ul>
              <p>Non vengono richiesti dati sensibili.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">3. Finalità del Trattamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>I dati vengono trattati esclusivamente per:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>generare analisi tecniche richieste dall'utente;</li>
                <li>testare le funzionalità;</li>
                <li>migliorare il sistema.</li>
              </ul>
              <p>Non vengono utilizzati per marketing o profilazione.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">4. Base Giuridica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Il trattamento si basa sul consenso espresso dall'utente mediante utilizzo della piattaforma in fase di test.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">5. Conservazione dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                I dati vengono conservati solo per il tempo necessario alle attività di test.
                È possibile richiederne la cancellazione in qualsiasi momento.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">6. Condivisione dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                I dati non vengono ceduti a soggetti commerciali.
                Potranno essere utilizzati servizi tecnici indispensabili al funzionamento della piattaforma, che trattano i dati in qualità di strumenti di supporto.
                In nessun caso i dati sono utilizzati per scopi pubblicitari o di profilazione.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">7. Diritti dell'Utente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>L'utente può richiedere:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>accesso ai dati;</li>
                <li>rettifica;</li>
                <li>cancellazione;</li>
                <li>limitazione del trattamento;</li>
                <li>revoca del consenso.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">8. Sicurezza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Sono adottate misure tecniche compatibili con un ambiente di test per proteggere i dati da accessi non autorizzati.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
