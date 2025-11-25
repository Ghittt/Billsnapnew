import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold mb-6">Siamo stanchi quanto te.</h2>
              <p>
                Stanchi di bollette incomprensibili, confronti impossibili e promesse che non portano da nessuna parte.
                Stanchi di provider che cambiano i prezzi quando vogliono.
                Stanchi di siti che dicono "risparmi fino a…" senza mostrarti nulla di reale.
              </p>

              <p className="mt-4">
                BillSnap nasce da una semplice idea:<br />
                <strong>"Se è la tua energia, perché è così difficile capire quanto paghi davvero?"</strong>
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Cos'è BillSnap (senza giri di parole)</h2>
              <p>
                BillSnap è un agente AI che analizza la tua bolletta, la legge come un esperto, individua gli sprechi 
                e trova automaticamente l'offerta migliore sul mercato.
              </p>
              <p>
                Niente pubblicità.<br />
                Niente sponsor nascosti.<br />
                Niente piani a pagamento.<br />
                <strong>Guadagniamo solo quando tu risparmi davvero.</strong>
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Perché siamo diversi</h2>
              <p>
                Non siamo un comparatore.<br />
                Non siamo un'agenzia.<br />
                Non vendiamo abbonamenti.
              </p>
              <p>
                <strong>Siamo una tecnologia che fa una cosa sola: ridurre la tua bolletta al minimo possibile.</strong>
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">Utilizziamo:</h2>
              <ul>
                <li>OCR avanzato per leggere le bollette</li>
                <li>Firecrawl + AI per analizzare le offerte reali</li>
                <li>Normalizzazione intelligente dei dati</li>
                <li>Stima del risparmio mensile, non solo annuale</li>
                <li>Avvisi automatici quando appare un'offerta migliore</li>
              </ul>

              <h2 className="text-2xl font-bold mt-8 mb-4">La nostra promessa</h2>
              <p>
                Non promettiamo miracoli.<br />
                Promettiamo onestà:
              </p>
              <p>
                Se il risparmio è alto, lo diciamo chiaramente.<br />
                Se è basso, lo diciamo allo stesso modo.
              </p>

              <h2 className="text-2xl font-bold mt-8 mb-4">La nostra missione</h2>
              <p>
                Rendere la bolletta un non-problema.<br />
                Far risparmiare migliaia di famiglie italiane senza confusione.<br />
                Portare l'energia nel 2025, non nel passato.
              </p>

            <div className="mt-8 p-6 bg-primary/5 rounded-lg border border-primary/10">
              <p className="font-semibold text-primary text-xl mb-0">
                Stessa energia, meno stress. BillSnap pensa al resto.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-wrap gap-4 justify-center text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span>•</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Termini e Condizioni
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
