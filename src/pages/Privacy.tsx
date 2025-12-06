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
              BILL SNAP (VERSIONE TEST / NO SOCIETÀ / NO LUCRO)
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
                BillSnap è attualmente un progetto sperimentale, non commerciale, privo di titolare del trattamento in forma societaria. I dati vengono trattati esclusivamente dal creatore del progetto, in forma privata, per finalità di test, ricerca e sviluppo.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">2. Titolare del Trattamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Poiché non esiste una società operativa, il trattamento dei dati viene effettuato unicamente dal creatore del progetto, a titolo personale, per scopi non commerciali.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">3. Finalità del Trattamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                I dati inviati (es. foto bollette, consumo, testi OCR, informazioni contrattuali) vengono utilizzati solo per:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>analisi tecnica tramite algoritmi AI;</li>
                <li>test delle funzionalità;</li>
                <li>miglioramento dell'accuratezza del sistema.</li>
              </ul>
              <p>Non vengono utilizzati per marketing, profilazione commerciale o cessione a terzi.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">4. Base Giuridica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Il trattamento si basa sull'art. 6, par.1, lett. a) GDPR: consenso dell'utente mediante utilizzo della piattaforma durante la fase di test.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">5. Tipologia di Dati Raccolti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <ul className="list-disc pl-6 space-y-2">
                <li>immagini o PDF delle bollette;</li>
                <li>informazioni energetiche;</li>
                <li>dati tecnici di utilizzo;</li>
                <li>eventuali dati inseriti volontariamente dall'utente.</li>
              </ul>
              <p>Non vengono raccolti dati sensibili (salvo che l'utente li inserisca spontaneamente).</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">6. Conservazione dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                I dati vengono conservati solo per il tempo necessario al test tecnico. L'utente può richiederne la cancellazione in qualsiasi momento.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">7. Condivisione dei Dati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>Nessun dato viene condiviso con:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>società energetiche;</li>
                <li>servizi pubblicitari;</li>
                <li>servizi terzi non indispensabili.</li>
              </ul>
              <p>Uniche eccezioni:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>fornitori tecnici indispensabili (es. OCR Gemini, hosting Supabase).</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">8. Diritti dell'Utente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>L'utente può richiedere in qualsiasi momento:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>accesso ai propri dati;</li>
                <li>rettifica;</li>
                <li>cancellazione;</li>
                <li>limitazione del trattamento;</li>
                <li>revoca del consenso.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">9. Sicurezza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Pur non essendo un prodotto commerciale, BillSnap adotta misure tecniche di salvaguardia compatibili con un ambiente di test (criptazione, accessi limitati).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
