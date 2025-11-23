import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingDown, Lock, Zap, Award, ArrowRight, Users } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const handleFileUpload = (files: File[]) => {
    navigate('/upload', { state: { files } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Gradient */}
      <section className="relative overflow-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 gradient-glow" />
        
        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-5xl mx-auto text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 backdrop-blur-sm border border-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Powered by SnapAi™</span>
            </div>
            
            {/* Hero Title */}
            <h1 className="text-6xl md:text-8xl font-bold leading-tight tracking-tight">
              <span className="text-gradient">Risparmia</span>
              <br />
              <span className="text-foreground">sulle tue bollette</span>
            </h1>
            
            {/* Hero Description */}
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Carica la tua bolletta. SnapAi™ trova automaticamente l'offerta perfetta per te. 
              <span className="text-foreground font-semibold"> Zero stress, massimo risparmio.</span>
            </p>
            
            {/* Upload Zone */}
            <div className="max-w-2xl mx-auto pt-8">
              <UploadZone onFileUpload={handleFileUpload} />
              
              {/* Trust Indicators */}
              <div className="flex items-center justify-center gap-6 mt-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>100% Sicuro</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Risultati in 25s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span>50+ Fornitori</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collective Offer Teaser */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="border-primary/30 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold">Offerta Collettiva BillSnap</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Unisciti al gruppo: a 2.000 adesioni negoziamo l'offerta più bassa
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Più siamo, meno paghiamo. Stiamo costruendo la prima offerta di gruppo sull'energia.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      ✓ Tariffa esclusiva • Zero vincoli • Info chiare
                    </p>
                    <Button 
                      variant="outline"
                      className="w-full sm:w-auto" 
                      size="lg"
                      onClick={() => navigate('/offerta-collettiva')}
                    >
                      Scopri di più
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Stat 1 */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl font-bold text-gradient mb-3">
                    €427
                  </div>
                  <p className="text-base text-muted-foreground">
                    Risparmio medio all'anno
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Dati aggiornati 2025
                  </p>
                </CardContent>
              </Card>
              
              {/* Stat 2 */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl font-bold text-gradient mb-3">
                    25s
                  </div>
                  <p className="text-base text-muted-foreground">
                    Tempo di analisi
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Velocità media AI
                  </p>
                </CardContent>
              </Card>
              
              {/* Stat 3 */}
              <Card className="border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-8 text-center">
                  <div className="text-6xl font-bold text-gradient mb-3">
                    98%
                  </div>
                  <p className="text-base text-muted-foreground">
                    Utenti soddisfatti
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    Rating medio
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-5xl md:text-6xl font-bold mb-4">
                Semplice. <span className="text-gradient">Veloce.</span> Efficace.
              </h2>
              <p className="text-xl text-muted-foreground">
                Tre passi per iniziare a risparmiare
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-12">
              {/* Step 1 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                <div className="relative text-center space-y-4 p-6">
                  <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-3xl font-bold text-white">1</span>
                  </div>
                  <h3 className="text-2xl font-bold">Carica</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Scatta una foto alla tua bolletta o carica il PDF. Accettiamo qualsiasi formato.
                  </p>
                </div>
              </div>
              
              {/* Step 2 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                <div className="relative text-center space-y-4 p-6">
                  <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-3xl font-bold text-white">2</span>
                  </div>
                  <h3 className="text-2xl font-bold">Analizza</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    SnapAi™ confronta 50+ fornitori in tempo reale per trovare l'offerta perfetta.
                  </p>
                </div>
              </div>
              
              {/* Step 3 */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300" />
                <div className="relative text-center space-y-4 p-6">
                  <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <span className="text-3xl font-bold text-white">3</span>
                  </div>
                  <h3 className="text-2xl font-bold">Risparmia</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Ricevi un report dettagliato con l'offerta migliore. Attivala in un click.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-5" />
        <div className="relative container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/20 shadow-xl bg-gradient-subtle backdrop-blur-sm">
              <CardContent className="p-12 text-center space-y-6">
                <div className="w-16 h-16 gradient-hero rounded-2xl flex items-center justify-center mx-auto shadow-glow">
                  <TrendingDown className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-4xl md:text-5xl font-bold">
                  Inizia a risparmiare <span className="text-gradient">oggi</span>
                </h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Unisciti a migliaia di italiani che hanno già ridotto le loro bollette.
                  Nessuna registrazione richiesta per iniziare.
                </p>
                <Button 
                  size="lg" 
                  className="text-lg px-8 py-6 gradient-hero border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}
                >
                  Analizza la tua bolletta
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <div>
              <p>© {new Date().getFullYear()} BillSnap - Progetto in fase di test</p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/terms-and-conditions" className="hover:text-foreground transition-colors">
                Termini e Condizioni
              </Link>
              <Link to="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link to="/feedback" className="hover:text-foreground transition-colors">
                Feedback
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
