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
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      {/* Hero Section - Essential flow without friction */}
      <section className="relative py-12 md:py-20 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-5"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto">
            
            {/* Main Value Proposition */}
            <div className="text-center space-y-8 mb-16 animate-fade-in">
              <div className="flex justify-center animate-scale-in">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary blur-2xl opacity-30 animate-pulse"></div>
                  <img src={billIcon} alt="BillSnap" className="w-20 h-20 md:w-24 md:h-24 relative z-10" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
                Carica la tua bolletta
                <span className="block bg-gradient-primary bg-clip-text text-transparent mt-3">
                  Risparmia subito
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium">
                Carica una foto o un PDF della tua bolletta. 
                <span className="block mt-2 text-foreground">Niente moduli, niente attese complicate.</span>
              </p>
            </div>

            {/* Single Action: Upload */}
            <div className="max-w-2xl mx-auto space-y-8">
              <UploadZone onFileUpload={handleFileUpload} />
              
              {/* Trust indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Dati cancellati dopo l'analisi</span>
                <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Simple 3 steps */}
      <section className="py-16 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
              Come funziona
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1: Upload */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-medium">
                  <Upload className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">1. Carica</h3>
                <p className="text-muted-foreground">
                  Foto o PDF della tua bolletta. Supportiamo tutti i formati.
                </p>
              </div>
              
              {/* Step 2: Analysis */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto shadow-medium">
                  <Clock className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">2. Analizza</h3>
                <p className="text-muted-foreground">
                  Stiamo leggendo i dati della tua bolletta… ~25s
                </p>
              </div>
              
              {/* Step 3: Save */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-savings rounded-full flex items-center justify-center mx-auto shadow-medium">
                  <CheckCircle className="w-8 h-8 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">3. Risparmia</h3>
                <p className="text-muted-foreground">
                  Attiva l'offerta migliore in 5-10 minuti.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notification Feature - Premium Value */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-background/10 backdrop-blur-sm rounded-full border-2 border-background/20 shadow-elegant">
              <Bell className="w-10 h-10 text-primary-foreground animate-pulse" />
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground leading-tight">
              Non perdere mai più un risparmio
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto leading-relaxed">
              Registrati e attiva la migliore offerta che ti proponiamo. 
              <span className="block mt-3 font-semibold text-primary-foreground">
                Ti avviseremo automaticamente quando arriva un'offerta ancora più vantaggiosa.
              </span>
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm px-6 py-3 rounded-full border border-background/20">
                <TrendingDown className="w-5 h-5 text-primary-foreground" />
                <span className="text-primary-foreground font-medium">Sempre il miglior prezzo</span>
              </div>
              <div className="flex items-center gap-2 bg-background/10 backdrop-blur-sm px-6 py-3 rounded-full border border-background/20">
                <CheckCircle className="w-5 h-5 text-primary-foreground" />
                <span className="text-primary-foreground font-medium">Notifiche istantanee</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value proposition cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <Card className="border-success/20 bg-gradient-to-br from-success/5 to-success/10 hover-scale transition-all duration-300 shadow-medium hover:shadow-elegant">
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-4xl md:text-5xl font-bold text-success">
                  €400+
                </div>
                <p className="text-lg text-foreground font-medium">
                  Risparmio medio annuo dei nostri utenti
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 hover-scale transition-all duration-300 shadow-medium hover:shadow-elegant">
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-4xl md:text-5xl font-bold text-primary">
                  25s
                </div>
                <p className="text-lg text-foreground font-medium">
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
