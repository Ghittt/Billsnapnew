import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Clock, CheckCircle, Shield, Bell, TrendingDown } from 'lucide-react';
import billIcon from '@/assets/bill-icon.png';
import heroImage from '@/assets/hero-bg.jpg';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFileUpload = (files: File[]) => {
    // Navigate to upload page with files (no login required)
    navigate('/upload', { state: { files } });
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      {/* Hero Section - Apple-inspired premium design */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-3"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            
            {/* Main Value Proposition */}
            <div className="text-center space-y-10 mb-20 animate-fade-in">
              <div className="flex justify-center animate-scale-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary blur-3xl opacity-20 animate-pulse"></div>
                  <div className="relative z-10 p-6 rounded-3xl glass">
                    <img src={billIcon} alt="BillSnap" className="w-24 h-24 md:w-28 md:h-28" />
                  </div>
                </div>
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[1.1] tracking-tight">
                Carica la tua bolletta
                <span className="block bg-gradient-primary bg-clip-text text-transparent mt-4">
                  Risparmia subito
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium leading-relaxed">
                Carica una foto o un PDF della tua bolletta. 
                <span className="block mt-3 text-foreground font-semibold">Niente moduli, niente attese complicate.</span>
              </p>
            </div>

            {/* Single Action: Upload - Glass effect */}
            <div className="max-w-3xl mx-auto space-y-10">
              <div className="glass rounded-3xl p-2 shadow-elegant">
                <UploadZone onFileUpload={handleFileUpload} />
              </div>
              
              {/* Trust indicator */}
              <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-medium">Dati cancellati dopo l'analisi</span>
                <span className="text-border">•</span>
                <a href="/privacy" className="text-primary hover:text-primary-dark transition-smooth font-medium">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Apple-style cards */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-center text-foreground mb-16 tracking-tight">
              Come funziona
            </h2>
            <div className="grid md:grid-cols-3 gap-8 md:gap-10">
              {/* Step 1: Upload */}
              <div className="text-center space-y-6 p-8 rounded-3xl glass hover-scale transition-spring group">
                <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-medium group-hover:shadow-strong transition-spring">
                  <Upload className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">1. Carica</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Foto o PDF della tua bolletta. Supportiamo tutti i formati.
                </p>
              </div>
              
              {/* Step 2: Analysis */}
              <div className="text-center space-y-6 p-8 rounded-3xl glass hover-scale transition-spring group">
                <div className="w-20 h-20 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto shadow-medium group-hover:shadow-strong transition-spring">
                  <Clock className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">2. Analizza</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Stiamo leggendo i dati della tua bolletta… ~25s
                </p>
              </div>
              
              {/* Step 3: Save */}
              <div className="text-center space-y-6 p-8 rounded-3xl glass hover-scale transition-spring group">
                <div className="w-20 h-20 bg-gradient-savings rounded-2xl flex items-center justify-center mx-auto shadow-medium group-hover:shadow-strong transition-spring">
                  <CheckCircle className="w-10 h-10 text-primary-foreground" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">3. Risparmia</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Attiva l'offerta migliore in 5-10 minuti.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notification Feature - Premium gradient section */}
      <section className="py-32 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-10">
            <div className="inline-flex items-center justify-center w-24 h-24 glass-dark rounded-3xl border-2 border-white/20 shadow-elegant animate-scale-in">
              <Bell className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-tight tracking-tight">
              Non perdere mai più un risparmio
            </h2>
            <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed font-medium">
              Registrati e attiva la migliore offerta che ti proponiamo. 
              <span className="block mt-4 text-white font-bold">
                Ti avviseremo automaticamente quando arriva un'offerta ancora più vantaggiosa.
              </span>
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-6">
              <div className="flex items-center gap-3 glass-dark px-8 py-4 rounded-2xl border border-white/20 hover-scale transition-spring">
                <TrendingDown className="w-6 h-6 text-white" />
                <span className="text-white font-semibold text-lg">Sempre il miglior prezzo</span>
              </div>
              <div className="flex items-center gap-3 glass-dark px-8 py-4 rounded-2xl border border-white/20 hover-scale transition-spring">
                <CheckCircle className="w-6 h-6 text-white" />
                <span className="text-white font-semibold text-lg">Notifiche istantanee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value proposition cards - Apple-style */}
      <section className="py-32 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-10">
            <Card className="border-success/10 bg-gradient-to-br from-success/5 to-success/10 hover-scale transition-spring shadow-medium hover:shadow-elegant rounded-3xl overflow-hidden group">
              <CardContent className="p-12 text-center space-y-6">
                <div className="text-6xl md:text-7xl font-bold text-success tracking-tight">
                  €400+
                </div>
                <p className="text-xl text-foreground font-semibold leading-relaxed">
                  Risparmio medio annuo dei nostri utenti
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/10 bg-gradient-to-br from-primary/5 to-accent/5 hover-scale transition-spring shadow-medium hover:shadow-elegant rounded-3xl overflow-hidden group">
              <CardContent className="p-12 text-center space-y-6">
                <div className="text-6xl md:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent tracking-tight">
                  25s
                </div>
                <p className="text-xl text-foreground font-semibold leading-relaxed">
                  Tempo medio per l'analisi completa
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
