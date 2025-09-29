import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-bg.jpg';
import billIcon from '@/assets/bill-icon.png';

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    
    try {
      // Simulate upload process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setUploadedFiles(files);
      toast({
        title: "Upload completato!",
        description: `${files.length} file caricati con successo`,
      });
      
      // Simulate processing and redirect to results
      setTimeout(() => {
        navigate('/results');
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Errore nell'upload",
        description: "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="flex justify-center">
              <img src={billIcon} alt="BillSnap" className="w-20 h-20" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Trova l'offerta luce e gas
              <span className="text-primary"> più conveniente</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Carica le tue bollette e scopri quanto puoi risparmiare con l'analisi AI di BillSnap
            </p>
          </div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Inizia l'analisi</h2>
              <p className="text-muted-foreground">
                Supportiamo bollette in formato JPG, PNG, HEIC e PDF
              </p>
            </div>

            <UploadZone onFileUpload={handleFileUpload} isUploading={isUploading} />

            {uploadedFiles.length > 0 && (
              <Card className="border-success bg-success/5">
                <CardHeader>
                  <CardTitle className="text-success flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    File caricati
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-background rounded-md">
                        <span className="text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-foreground mb-12">
              Come funziona
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">1. Carica</h3>
                <p className="text-sm text-muted-foreground">
                  Carica le tue bollette luce e gas in qualsiasi formato
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">2. Analizza</h3>
                <p className="text-sm text-muted-foreground">
                  La nostra AI estrae automaticamente i dati principali
                </p>
              </div>
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-gradient-savings rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-6 h-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground">3. Risparmia</h3>
                <p className="text-sm text-muted-foreground">
                  Confronta le migliori offerte e cambia fornitore
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UploadPage;