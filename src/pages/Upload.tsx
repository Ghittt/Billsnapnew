import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
      const file = files[0]; // Process first file for MVP
      
      // Upload file to storage
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/bills/${Date.now()}-${file.name}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      // Save upload record
      const { data: uploadData, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          file_url: `bills/${Date.now()}-${file.name}`,
          file_type: file.type,
          file_size: file.size
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Process with OCR
      const ocrFormData = new FormData();
      ocrFormData.append('file', file);
      ocrFormData.append('uploadId', uploadData.id);

      const ocrResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: ocrFormData
      });

      if (!ocrResponse.ok) {
        throw new Error('OCR processing failed');
      }

      const ocrData = await ocrResponse.json();
      console.log('OCR Data:', ocrData);

      // Calculate savings
      const savingsResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-savings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uploadId: uploadData.id })
      });

      if (!savingsResponse.ok) {
        throw new Error('Savings calculation failed');
      }

      const savingsData = await savingsResponse.json();
      
      setUploadedFiles(files);
      toast({
        title: "Analisi completata!",
        description: `Bolletta analizzata con successo`,
      });
      
      // Navigate to results with data
      navigate('/results', { 
        state: { 
          savingsData,
          uploadId: uploadData.id 
        } 
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Errore nell'analisi",
        description: "Si è verificato un errore durante l'analisi della bolletta. Riprova.",
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