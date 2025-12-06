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
              TERMINI E CONDIZIONI DI UTILIZZO
            </h1>
            <p className="text-foreground font-medium">
              BILL SNAP (VERSIONE TEST / NON COMMERCIALE)
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
                BillSnap è un progetto sperimentale attualmente in fase di test (“Beta privata”).
                Non rappresenta un servizio commerciale, non costituisce un prodotto finito e non è gestito da una società attiva.
                L'accesso viene fornito esclusivamente per finalità di prova, ricerca e validazione tecnica.
                Il progetto non genera alcun ricavo, non vende servizi e non effettua attività commerciale.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">2. Oggetto del Servizio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                BillSnap permette di caricare bollette e ottenere analisi generate da sistemi automatizzati.
                Le informazioni fornite sono stime sperimentali e non costituiscono consulenza energetica, tecnica o finanziaria.
              </p>
              <p>L'utente accetta che:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>gli output possono contenere errori;</li>
                <li>il servizio può essere modificato o interrotto;</li>
                <li>il sistema è in costante sviluppo.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">3. Limitazione di Responsabilità</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>Essendo un progetto in fase di test, BillSnap non può essere ritenuto responsabile per:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>errori nei calcoli;</li>
                <li>interpretazioni errate delle bollette;</li>
                <li>interruzioni o malfunzionamenti;</li>
                <li>decisioni prese dall'utente sulla base degli output generati.</li>
              </ul>
              <p className="font-medium">L'utilizzo avviene sotto esclusiva responsabilità dell'utente.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">4. Uso Consentito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>L'utente può utilizzare la piattaforma esclusivamente per finalità di test.</p>
              <p>Non è consentito:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>usarla a fini commerciali o professionali;</li>
                <li>redistribuire o rivendere i contenuti;</li>
                <li>tentare di accedere a componenti interne o tecniche;</li>
                <li>inviare dati di terzi senza autorizzazione.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">5. Contenuti Caricati dall'Utente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>I dati forniti (es. bollette, immagini, testi) vengono trattati solo per:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>generare analisi richieste dall'utente;</li>
                <li>migliorare la qualità del sistema;</li>
                <li>finalità di test e sviluppo.</li>
              </ul>
              <p>I contenuti non sono condivisi con soggetti commerciali.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">6. Interruzione o Modifica del Servizio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                BillSnap può essere sospeso, aggiornato o interrotto in qualsiasi momento senza preavviso, trattandosi di un progetto non commerciale in evoluzione.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">7. Proprietà Intellettuale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Design, contenuti e logiche appartengono all'autore del progetto.
                È vietata la copia o l'utilizzo non autorizzato.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">8. Legge Applicabile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                In assenza di un rapporto commerciale, si applicano i principi generali del diritto italiano.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
