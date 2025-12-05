import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold mb-6 text-primary">Siamo stanchi quanto te.</h2>
              <p className="text-foreground">
                Stanchi di bollette incomprensibili, confronti impossibili e promesse che non portano da nessuna parte.
                Stanchi di provider che cambiano i prezzi quando vogliono.
                Stanchi di siti che dicono "risparmi fino a…" senza mostrarti nulla di reale.
              </p>

              <p className="mt-4 text-foreground">
                BillSnap nasce da una semplice idea:<br />
                <strong className="text-primary">"Se è la tua energia, perché è così difficile capire quanto paghi davvero?"</strong>
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-primary">Cos'è BillSnap (senza giri di parole)</h2>
              <p className="text-foreground">
                BillSnap è un agente AI che analizza la tua bolletta, la legge come un esperto, individua gli sprechi 
                e trova automaticamente l'offerta migliore sul mercato.
              </p>
              <p className="text-foreground">
                Niente pubblicità.<br />
                Niente sponsor nascosti.<br />
                Niente piani a pagamento.<br />
                <strong className="text-primary">Guadagniamo solo quando tu risparmi davvero.</strong>
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-primary">Perché siamo diversi</h2>
              <p className="text-foreground">
                Non siamo un comparatore.<br />
                Non siamo un'agenzia.<br />
                Non vendiamo abbonamenti.
              </p>
              <p className="text-foreground">
                <strong className="text-primary">Siamo una tecnologia che fa una cosa sola: ridurre la tua bolletta al minimo possibile.</strong>
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-primary">Utilizziamo:</h2>
              <ul className="text-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>OCR avanzato per leggere le bollette</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Firecrawl + AI per analizzare le offerte reali</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Normalizzazione intelligente dei dati</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Stima del risparmio mensile, non solo annuale</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Avvisi automatici quando appare un'offerta migliore</span>
                </li>
              </ul>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-primary">La nostra promessa</h2>
              <p className="text-foreground">
                Non promettiamo miracoli.<br />
                Promettiamo onestà:
              </p>
              <p className="text-foreground">
                Se il risparmio è alto, lo diciamo chiaramente.<br />
                Se è basso, lo diciamo allo stesso modo.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4 text-primary">La nostra missione</h2>
              <p className="text-foreground">
                Rendere la bolletta un non-problema.<br />
                Far risparmiare migliaia di famiglie italiane senza confusione.<br />
                Portare l'energia nel 2025, non nel passato.
              </p>

            <div className="mt-8 p-6 bg-primary/10 rounded-lg border border-primary/30">
              <p className="font-semibold text-primary text-xl mb-0">
                Stessa energia, meno stress. BillSnap pensa al resto.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link to="/" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Home
            </Link>
            <span className="text-primary/50">•</span>
            <Link to="/terms" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Termini e Condizioni
            </Link>
            <span className="text-primary/50">•</span>
            <Link to="/privacy" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Privacy Policy
            </Link>
            <span className="text-primary/50">•</span>
            <Link to="/data-deletion" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Cancella i miei dati
            </Link>
            <span className="text-primary/50">•</span>
            <Link to="/feedback" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Feedback
            </Link>
            <span className="text-primary/50">•</span>
            <Link to="/offerta-collettiva" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Offerta Collettiva
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
