import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import ProgressIndicator from '@/components/upload/ProgressIndicator';
import { ManualBillInputModal } from '@/components/upload/ManualBillInputModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Upload, AlertTriangle, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-bg.jpg';
import billIcon from '@/assets/bill-icon.png';
import '@/types/analytics';

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'ocr' | 'calculate' | 'complete'>('upload');
  const [retryCount, setRetryCount] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle files passed from Index page
  useEffect(() => {
    if (location.state?.files) {
      handleFileUpload(location.state.files);
    }
  }, [location.state]);

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    setCurrentStep('upload');
    setRetryCount(0);
    
    // Track analytics event
    if (typeof gtag !== 'undefined') {
      gtag('event', 'upload_started', {
        'event_category': 'engagement',
        'event_label': files[0]?.type || 'unknown'
      });
    }
    
    try {
      const file = files[0]; // Process first file for MVP
      
      // Validate file
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('File troppo grande. Massimo 20MB consentiti.');
      }

      // Step 1: Upload file
      setCurrentStep('upload');
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

      // Get authenticated user (optional)
      const { data: { user } } = await supabase.auth.getUser();

      const { data: uploadData, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          file_url: `bills/${Date.now()}-${file.name}`,
          file_type: file.type,
          file_size: file.size,
          user_id: user?.id || null
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // Track upload success
      if (typeof gtag !== 'undefined') {
        gtag('event', 'upload_succeeded', {
          'event_category': 'engagement'
        });
      }

      // Step 2: OCR Processing
      setCurrentStep('ocr');
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
        console.error('OCR failed, status:', ocrResponse.status);
        
        // Retry logic for common OCR failures
        if (retryCount < 1) {
          console.log(`Retrying OCR (attempt ${retryCount + 1})...`);
          setRetryCount(retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return handleFileUpload(files);
        }
        
        // OCR failed after retries - offer manual input
        console.log('OCR failed after retries, opening manual input modal');
        setPendingUploadId(uploadData.id);
        setShowManualInput(true);
        setIsUploading(false);
        return;
      }

      const ocrData = await ocrResponse.json();
      
      console.log('OCR response:', ocrData);
      
      // Track OCR completion
      if (typeof gtag !== 'undefined') {
        gtag('event', 'ocr_completed', {
          'event_category': 'engagement'
        });
      }

      // Step 3: Compare offers and get AI explanation
      setCurrentStep('calculate');
      const { data: compareData, error: compareError } = await supabase.functions.invoke('compare-offers', {
        body: { uploadId: uploadData.id }
      });

      if (compareError) {
        console.error('Compare offers error:', compareError);
        throw new Error('Errore nel confronto delle offerte');
      }

      console.log('Offers compared successfully:', compareData);
      
      // Step 4: Complete (AI explanations will be generated in Results page)
      setCurrentStep('complete');
      setUploadedFiles(files);
      
      // Track result shown
      if (typeof gtag !== 'undefined') {
        gtag('event', 'result_shown', {
          'event_category': 'engagement',
          'value': compareData?.best?.total_year || 0
        });
      }
      
      setTimeout(() => {
        navigate(`/results?uploadId=${uploadData.id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Upload error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 
        "Si è verificato un errore durante l'analisi della bolletta.";
      
      // Show appropriate error message
      if (errorMessage.includes('leggere')) {
        toast({
          title: "Bolletta non leggibile",
          description: errorMessage,
          variant: "destructive",
          action: retryCount < 2 ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setRetryCount(prev => prev + 1);
                handleFileUpload(files);
              }}
            >
              Riprova
            </Button>
          ) : undefined
        });
      } else {
        toast({
          title: "Errore nell'analisi",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualInput = async (fields: any) => {
    if (!pendingUploadId) return;

    try {
      setShowManualInput(false);
      setIsUploading(true);
      setCurrentStep('calculate');

      // Store manual fields in bills table
      await supabase.from("bills").insert({
        fields_json: fields,
        raw_text: "Manual input"
      });

      // Create OCR result with manual data
      const { error: ocrInsertError } = await supabase
        .from("ocr_results")
        .insert({
          upload_id: pendingUploadId,
          annual_kwh: fields.kwh_period,
          f1_kwh: fields.f1_kwh,
          f2_kwh: fields.f2_kwh,
          f3_kwh: fields.f3_kwh,
          potenza_kw: fields.potenza_kw,
          total_cost_eur: fields.fixed_fee_month * 12,
          quality_score: 0.5, // Manual input quality score
          tariff_hint: "manual"
        });

      if (ocrInsertError) throw ocrInsertError;

      // Continue with comparison
      console.log("Calling offer comparison with manual data...");
      const { data: compareData, error: compareError } = await supabase.functions.invoke('compare-offers', {
        body: { uploadId: pendingUploadId }
      });

      if (compareError) throw compareError;

      console.log('Offers compared successfully:', compareData);

      // AI explanations will be generated in Results page
      setCurrentStep('complete');
      
      toast({
        title: "Analisi completata!",
        description: "Confronto offerte completato con i dati inseriti manualmente.",
      });

      setTimeout(() => {
        navigate(`/results?uploadId=${pendingUploadId}`);
      }, 1000);

    } catch (error) {
      console.error("Error processing manual input:", error);
      toast({
        title: "Errore",
        description: "Errore durante l'elaborazione dei dati. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setPendingUploadId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {!isUploading && uploadedFiles.length === 0 && (
            <>
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-semibold">
                  Analizza la tua bolletta
                </h1>
                <p className="text-lg text-muted-foreground">
                  Carica una foto o un PDF
                </p>
              </div>

              <UploadZone onFileUpload={handleFileUpload} isUploading={false} />
              
              <div className="text-center text-sm text-muted-foreground">
                <Shield className="w-4 h-4 inline mr-1" />
                Dati protetti e cancellati dopo l'analisi
              </div>
            </>
          )}

          {isUploading && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-semibold mb-2">
                  Analisi in corso
                </h2>
                <p className="text-muted-foreground">
                  Non chiudere questa pagina
                </p>
              </div>
              
              <ProgressIndicator currentStep={currentStep} />
            </div>
          )}

          {uploadedFiles.length > 0 && !isUploading && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-success mx-auto" />
                <h3 className="text-xl font-semibold">Completato!</h3>
                <p className="text-muted-foreground">
                  Caricamento risultati...
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ManualBillInputModal
        open={showManualInput}
        onClose={() => {
          setShowManualInput(false);
          setPendingUploadId(null);
        }}
        onSubmit={handleManualInput}
      />
    </div>
  );
};

export default UploadPage;