import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, FileText, Info, Database, Lock } from "lucide-react";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Termini e Condizioni d'Uso</h1>
          <p className="text-muted-foreground text-lg">
            Ultima modifica: {new Date().toLocaleDateString('it-IT')}
          </p>
        </div>

        <div className="space-y-8">
          {/* Stato del Progetto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                1. Stato del Progetto
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                BillSnap è attualmente in <strong>fase di test e validazione</strong>. Non esiste una società operativa 
                che riceve denaro, né vengono effettuate transazioni economiche. Il servizio è offerto esclusivamente 
                a scopo dimostrativo e sperimentale.
              </p>
              <p>
                L'accesso al servizio è gratuito e non richiede alcun pagamento o sottoscrizione di contratti.
              </p>
            </CardContent>
          </Card>

          {/* Note Legali */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                2. Note Legali e Limitazioni
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                BillSnap è un prototipo in fase di validazione e non costituisce:
              </p>
              <ul>
                <li>Un'offerta commerciale vincolante</li>
                <li>Una proposta contrattuale</li>
                <li>Un servizio di intermediazione energetica regolamentato</li>
                <li>Una piattaforma di gestione pagamenti</li>
                <li>Un fornitore di servizi energetici</li>
              </ul>
              
              <h3 className="text-lg font-semibold mt-6 mb-3">2.1 Natura delle Analisi</h3>
              <p>
                Tutti i risultati forniti (confronti tariffari, analisi OCR, stime di risparmio, suggerimenti) 
                sono da considerarsi come <strong>stime indicative</strong> generate da algoritmi di intelligenza artificiale 
                e non sostituiscono:
              </p>
              <ul>
                <li>Consulenza professionale qualificata</li>
                <li>Analisi contrattuale specifica</li>
                <li>Valutazioni legali o fiscali</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-3">2.2 Responsabilità dell'Utente</h3>
              <p>
                L'utente utilizza il servizio sotto la propria responsabilità. BillSnap non è responsabile per:
              </p>
              <ul>
                <li>Decisioni prese sulla base delle analisi fornite</li>
                <li>Eventuali imprecisioni nei dati estratti tramite OCR</li>
                <li>Variazioni di prezzo o condizioni delle offerte energetiche</li>
                <li>Conseguenze derivanti dalla scelta di un fornitore energetico</li>
              </ul>
            </CardContent>
          </Card>

          {/* Privacy e GDPR */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                3. Privacy e Trattamento Dati (GDPR)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-3">3.1 Principi del Trattamento</h3>
              <p>
                Il trattamento dei dati personali avviene secondo i seguenti principi del GDPR (Regolamento UE 2016/679):
              </p>
              
              <h4 className="font-semibold mt-4 mb-2">Finalità</h4>
              <p>
                I dati caricati (bollette, foto, informazioni limitate) sono utilizzati unicamente per:
              </p>
              <ul>
                <li>Generare analisi energetiche tramite OCR e AI</li>
                <li>Confrontare offerte energetiche disponibili sul mercato</li>
                <li>Fornire stime personalizzate di risparmio</li>
                <li>Migliorare la qualità del servizio (analisi aggregate e anonimizzate)</li>
              </ul>

              <h4 className="font-semibold mt-4 mb-2">Minimizzazione</h4>
              <p>
                BillSnap raccoglie esclusivamente i dati strettamente necessari per fornire il servizio. 
                Non vengono raccolti dati sensibili per profilazione commerciale.
              </p>

              <h4 className="font-semibold mt-4 mb-2">Base Giuridica</h4>
              <p>Il trattamento si basa su:</p>
              <ul>
                <li><strong>Consenso esplicito</strong>: per l'upload di bollette e l'analisi</li>
                <li><strong>Interesse legittimo</strong>: per il miglioramento del servizio tramite analisi aggregate</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-3">3.2 Dati Raccolti</h3>
              <p>BillSnap può raccogliere:</p>
              <ul>
                <li><strong>Dati della bolletta</strong>: fornitore, consumo, costo, POD/PDR (estratti tramite OCR)</li>
                <li><strong>Indirizzo email</strong>: solo se fornito volontariamente per ricevere aggiornamenti</li>
                <li><strong>File caricati</strong>: PDF, immagini (JPG, PNG) delle bollette</li>
                <li><strong>Dati tecnici</strong>: timestamp, tipo di file, risultati dell'analisi</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-3">3.3 Non Condivisione</h3>
              <p>
                I dati <strong>non vengono ceduti, venduti o condivisi</strong> con terze parti commerciali. 
                L'unica eccezione riguarda:
              </p>
              <ul>
                <li><strong>Supabase</strong>: utilizzato come database sicuro gestito in territorio UE (GDPR-compliant)</li>
                <li><strong>Google Gemini AI</strong>: per l'elaborazione OCR (dati anonimizzati e non persistiti)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-3">3.4 Conservazione</h3>
              <p>
                I dati vengono conservati per il tempo strettamente necessario per fornire il servizio. 
                Nella fase di test, i dati possono essere conservati per analisi di qualità del servizio.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-3">3.5 Diritti dell'Utente (GDPR)</h3>
              <p>In conformità al GDPR, l'utente ha diritto a:</p>
              <ul>
                <li><strong>Accesso</strong>: richiedere copia dei dati conservati</li>
                <li><strong>Rettifica</strong>: correggere dati inesatti</li>
                <li><strong>Cancellazione</strong> (diritto all'oblio): richiedere eliminazione definitiva</li>
                <li><strong>Portabilità</strong>: ricevere i dati in formato strutturato</li>
                <li><strong>Opposizione</strong>: opporsi al trattamento per motivi legittimi</li>
                <li><strong>Limitazione</strong>: limitare il trattamento in determinate circostanze</li>
              </ul>
              <p className="mt-4">
                Per esercitare questi diritti, contattare: <strong>privacy@billsnap.it</strong> (simulato per scopi di test)
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-3">3.6 Sicurezza</h3>
              <p>
                BillSnap implementa misure tecniche e organizzative adeguate per proteggere i dati:
              </p>
              <ul>
                <li>Crittografia dei dati in transito (HTTPS/TLS)</li>
                <li>Crittografia dei dati a riposo (Supabase)</li>
                <li>Controllo accessi basato su autenticazione</li>
                <li>Backup regolari e disaster recovery</li>
                <li>Monitoraggio delle attività sospette</li>
              </ul>
            </CardContent>
          </Card>

          {/* Database e Storage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                4. Infrastruttura e Sicurezza Tecnica
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-3">4.1 Database</h3>
              <p>
                BillSnap utilizza <strong>Supabase</strong> come database backend, con server localizzati nell'Unione Europea. 
                Supabase è conforme al GDPR e certificato per la gestione sicura di dati personali.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-3">4.2 Storage File</h3>
              <p>
                I file caricati (bollette PDF, immagini) sono archiviati in bucket Supabase Storage con:
              </p>
              <ul>
                <li>Crittografia AES-256</li>
                <li>Accesso autenticato tramite token</li>
                <li>Politiche di accesso Row-Level Security (RLS)</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-3">4.3 Elaborazione AI</h3>
              <p>
                L'analisi OCR utilizza Google Gemini AI (gemini-2.5-pro/flash) tramite API. 
                I dati inviati a Gemini sono:
              </p>
              <ul>
                <li>Temporanei e non persistiti da Google</li>
                <li>Anonimizzati (nessun dato identificativo personale)</li>
                <li>Utilizzati solo per generare l'output richiesto</li>
              </ul>
            </CardContent>
          </Card>

          {/* Mission e Valori */}
          <Card id="chi-siamo">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                5. Chi Siamo - Mission e Valori
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <h3 className="text-lg font-semibold mb-3">La nostra storia</h3>
              <p>
                BillSnap nasce dalla frustrazione condivisa di migliaia di italiani di fronte alle bollette energetiche: 
                <strong> troppe voci incomprensibili, tariffe nascoste, confronti impossibili</strong>.
              </p>
              <p>
                Abbiamo creato la prima AI <strong>realmente focalizzata sul risparmio energetico personale</strong>: 
                non un semplice comparatore, ma un consulente digitale che legge, capisce e confronta la tua bolletta 
                con centinaia di offerte reali, <strong>in meno di 30 secondi</strong>.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-3">La nostra mission</h3>
              <p>
                Semplificare la comprensione delle bollette energetiche e aiutare le persone a identificare 
                offerte più convenienti in modo <strong>immediato, trasparente e senza stress</strong>.
              </p>

              <h3 className="text-lg font-semibold mt-6 mb-3">I nostri valori</h3>
              <ul>
                <li><strong>Trasparenza totale</strong>: nessuna commissione nascosta, nessun vincolo</li>
                <li><strong>Tecnologia al servizio delle persone</strong>: AI che lavora per te, non per le compagnie</li>
                <li><strong>Semplicità radicale</strong>: zero sforzo, massimo risultato</li>
                <li><strong>Privacy first</strong>: i tuoi dati sono tuoi, punto</li>
                <li><strong>Risparmio reale</strong>: consigliamo solo cambi che valgono davvero la pena</li>
              </ul>

              <h3 className="text-lg font-semibold mt-6 mb-3">La tecnologia SnapAI™</h3>
              <p>
                SnapAI™ è il motore intelligente di BillSnap: analizza pattern di consumo, comprende abitudini familiari, 
                confronta 50+ fornitori in tempo reale e suggerisce solo offerte che <strong>generano risparmio concreto</strong>.
              </p>
              <p>
                Non siamo un comparatore generico: siamo il tuo <strong>consulente energetico personale</strong>, 
                disponibile 24/7, che parla la tua lingua e pensa al tuo portafoglio.
              </p>

              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="font-semibold text-primary text-lg mb-2">
                  Stessa energia, meno stress. BillSnap pensa al resto.
                </p>
                <p className="text-sm text-muted-foreground">
                  Questa è la nostra promessa: rendere il risparmio energetico alla portata di tutti, 
                  senza burocrazia, senza tecnicismi, senza sorprese.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                6. Domande Frequenti (FAQ)
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
              <div>
                <h4 className="font-semibold text-base mb-2">Q: BillSnap è un servizio reale?</h4>
                <p>
                  <strong>A:</strong> È un prototipo funzionante in fase di test. Non gestisce pagamenti né contratti energetici. 
                  Tutte le funzionalità sono dimostrative.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Q: I miei dati sono al sicuro?</h4>
                <p>
                  <strong>A:</strong> Sì. I file vengono salvati su Supabase in UE con elevati standard di sicurezza 
                  (crittografia, GDPR-compliant) e non vengono ceduti a terzi commerciali.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Q: Perché devo caricare la bolletta?</h4>
                <p>
                  <strong>A:</strong> Serve per permettere all'OCR di leggere i dati corretti (consumo, prezzo, fornitore) 
                  e alla AI di generare un'analisi personalizzata e confrontare offerte reali.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Q: Posso cancellare i miei dati?</h4>
                <p>
                  <strong>A:</strong> Sì, in qualsiasi momento. Usa il <Link to="/data-deletion" className="text-primary hover:underline">modulo di richiesta cancellazione dati</Link> oppure contatta privacy@billsnap.it per esercitare il tuo diritto all'oblio (GDPR Art. 17). 
                  Riceverai conferma entro 30 giorni.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Q: BillSnap guadagna in qualche modo?</h4>
                <p>
                  <strong>A:</strong> No, nella fase attuale non esistono entrate. Nessun contratto, commissione o 
                  monetizzazione è attiva. Il progetto è puramente dimostrativo.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Q: Le analisi sono affidabili?</h4>
                <p>
                  <strong>A:</strong> Le analisi sono generate da AI (Gemini) basandosi sui dati estratti. 
                  Possono contenere imprecisioni e devono essere verificate prima di prendere decisioni. 
                  Non sostituiscono consulenza professionale.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Q: Cosa succede se clicco su un'offerta?</h4>
                <p>
                  <strong>A:</strong> Nella versione di test, cliccando su un'offerta viene solo registrato un evento 
                  di tracciamento (lead). Non viene attivato alcun contratto né effettuato alcun pagamento.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">Q: BillSnap è conforme al GDPR?</h4>
                <p>
                  <strong>A:</strong> Sì, BillSnap rispetta i principi del GDPR: minimizzazione dati, consenso esplicito, 
                  diritto all'oblio, sicurezza tecnica, e server in UE. Tutti i diritti dell'utente sono garantiti.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Modifiche */}
          <Card>
            <CardHeader>
              <CardTitle>7. Modifiche ai Termini</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>
                BillSnap si riserva il diritto di modificare questi termini in qualsiasi momento. 
                Le modifiche saranno pubblicate su questa pagina con data di aggiornamento. 
                L'uso continuato del servizio costituisce accettazione dei termini modificati.
              </p>
            </CardContent>
          </Card>

          {/* Contatti */}
          <Card>
            <CardHeader>
              <CardTitle>8. Contatti</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm dark:prose-invert max-w-none">
              <p>Per domande, richieste o esercizio dei diritti GDPR:</p>
              <ul>
                <li>Email: <strong>privacy@billsnap.it</strong> (simulato per test)</li>
                <li>Supporto: <Link to="/feedback" className="text-primary hover:underline">Pagina Feedback</Link></li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>•</span>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link to="/data-deletion" className="hover:text-foreground transition-colors">
              Cancella i miei dati
            </Link>
            <span>•</span>
            <Link to="/feedback" className="hover:text-foreground transition-colors">
              Feedback
            </Link>
            <span>•</span>
            <Link to="/offerta-collettiva" className="hover:text-foreground transition-colors">
              Offerta Collettiva
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
