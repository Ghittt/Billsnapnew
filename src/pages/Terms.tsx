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
                BillSnap è un progetto sperimentale attualmente in fase di test ("Beta privata"). Non rappresenta un servizio commerciale, non costituisce un prodotto finito e non è gestito da una società attiva. L'accesso viene fornito esclusivamente per finalità di prova, ricerca e validazione tecnica.
              </p>
              <p>
                BillSnap non genera alcun guadagno diretto, non vende servizi, non stipula contratti con gli utenti e non svolge attività commerciale o professionale.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">2. Oggetto del Servizio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                BillSnap fornisce strumenti di analisi automatica delle bollette e funzioni informative basate su AI, al solo scopo di testarne l'accuratezza.
                Le informazioni fornite sono stime, output sperimentali e non costituiscono consulenza professionale, energetica o finanziaria.
              </p>
              <p>L'utente accetta che:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>gli output possono contenere errori;</li>
                <li>il sistema è in continua evoluzione;</li>
                <li>il servizio può essere interrotto o modificato in qualsiasi momento.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">3. Limitazioni di Responsabilità</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Poiché il progetto è in fase di test e non è un servizio professionale, BillSnap non può essere ritenuto responsabile per:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>errori nei calcoli delle bollette;</li>
                <li>suggerimenti inesatti;</li>
                <li>malfunzionamenti tecnici;</li>
                <li>decisioni dell'utente prese sulla base dei risultati forniti.</li>
              </ul>
              <p className="font-medium">L'utilizzo è a rischio esclusivo dell'utente.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">4. Uso Consentito</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>All'utente è permesso utilizzare BillSnap esclusivamente per:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>testare le funzionalità;</li>
                <li>fornire feedback;</li>
                <li>validare l'accuratezza delle analisi.</li>
              </ul>
              <p>È vietato:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>utilizzare BillSnap per scopi professionali o commerciali;</li>
                <li>rivendere o redistribuire i contenuti;</li>
                <li>tentare di reverse-engineerare la tecnologia;</li>
                <li>inviare bollette o dati non di tua proprietà senza consenso.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">5. Contenuti dell'Utente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>I dati caricati (es. foto bollette) vengono utilizzati esclusivamente:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>per l'elaborazione tecnica;</li>
                <li>per il miglioramento del servizio;</li>
                <li>per test interni.</li>
              </ul>
              <p>Non vengono condivisi con terze parti commerciali.</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">6. Interruzioni del Servizio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                BillSnap può sospendere, modificare o interrompere l'accesso in qualsiasi momento, senza preavviso, essendo un progetto non commerciale in fase sperimentale.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">7. Proprietà Intellettuale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Tutti i contenuti, testi, interfacce, design e logiche appartengono all'autore del progetto. È vietata la copia non autorizzata dei contenuti o dell'interfaccia.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">8. Legge Applicabile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-foreground">
              <p>
                Essendo un progetto sperimentale non collegato a una società, non sussiste un rapporto commerciale giuridicamente vincolante. In caso di contenzioso, si applicano i principi generali del diritto italiano in materia di responsabilità per strumenti in fase di test.
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
