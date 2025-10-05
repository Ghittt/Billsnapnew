import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, Zap, CheckCircle, Shield, Bell } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleFileUpload = (files: File[]) => {
    navigate('/upload', { state: { files } });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section - Minimal Apple style */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            
            {/* Main Value Proposition */}
            <div className="text-center space-y-6 mb-16">
              <h1 className="text-5xl md:text-7xl font-semibold text-foreground leading-tight tracking-tight">
                Risparmia sulle tue bollette
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                Carica la tua bolletta e trova l'offerta migliore in pochi secondi
              </p>
            </div>

            {/* Upload Zone */}
            <div className="max-w-2xl mx-auto space-y-6">
              <UploadZone onFileUpload={handleFileUpload} />
              
              {/* Trust indicator */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>I tuoi dati sono al sicuro</span>
                <span>•</span>
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold text-center mb-12">
              Come funziona
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Carica</h3>
                <p className="text-muted-foreground">
                  Foto o PDF della tua bolletta
                </p>
              </div>
              
              {/* Step 2 */}
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center mx-auto">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Analizza</h3>
                <p className="text-muted-foreground">
                  L'AI confronta centinaia di offerte
                </p>
              </div>
              
              {/* Step 3 */}
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-success rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-success-foreground" />
                </div>
                <h3 className="text-xl font-semibold">Risparmia</h3>
                <p className="text-muted-foreground">
                  Attiva l'offerta migliore
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Notification Feature */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Bell className="w-12 h-12 text-primary-foreground mx-auto" />
            <h2 className="text-3xl md:text-5xl font-semibold text-primary-foreground">
              Non perdere mai un risparmio
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90">
              Registrati e ti avviseremo quando arriva un'offerta ancora più vantaggiosa
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-5xl font-semibold text-success mb-2">
                  €400+
                </div>
                <p className="text-muted-foreground">
                  Risparmio medio annuo
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-5xl font-semibold text-primary mb-2">
                  25s
                </div>
                <p className="text-muted-foreground">
                  Tempo di analisi
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
