import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import ProgressIndicator from '@/components/upload/ProgressIndicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Upload, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import heroImage from '@/assets/hero-bg.jpg';
import billIcon from '@/assets/bill-icon.png';
import '@/types/analytics';

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'ocr' | 'calculate' | 'complete'>('upload');
  const [retryCount, setRetryCount] = useState(0);
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

      // Get authenticated user (required for security)
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        // Redirect to auth if not logged in
        navigate('/auth', { state: { from: '/upload', files } });
        return;
      }

      const { data: uploadData, error: uploadError } = await supabase
        .from('uploads')
        .insert({
          file_url: `bills/${Date.now()}-${file.name}`,
          file_type: file.type,
          file_size: file.size,
          user_id: user.id
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
        throw new Error('Non riusciamo a leggere bene questa bolletta. Prova con un PDF o una foto più nitida.');
      }

      const ocrData = await ocrResponse.json();
      
      // Track OCR completion
      if (typeof gtag !== 'undefined') {
        gtag('event', 'ocr_completed', {
          'event_category': 'engagement'
        });
      }

      // Step 3: Calculate savings
      setCurrentStep('calculate');
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
      
      // Step 4: Complete
      setCurrentStep('complete');
      setUploadedFiles(files);
      
      // Track result shown
      if (typeof gtag !== 'undefined') {
        gtag('event', 'result_shown', {
          'event_category': 'engagement',
          'value': savingsData.annualSaving || 0
        });
      }
      
      setTimeout(() => {
        navigate('/results', { 
          state: { 
            savingsData,
            uploadId: uploadData.id 
          } 
        });
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

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {!isUploading && uploadedFiles.length === 0 && (
            <>
              {/* Simple upload interface */}
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <img src={billIcon} alt="BillSnap" className="w-16 h-16" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Analizza la tua bolletta
                </h1>
                <p className="text-lg text-muted-foreground">
                  Carica una foto o un PDF della tua bolletta. Niente moduli, niente attese complicate.
                </p>
              </div>

              <UploadZone onFileUpload={handleFileUpload} isUploading={false} />
              
              {/* Trust indicator */}
              <div className="text-center text-sm text-muted-foreground">
                🛡️ Dati cancellati dopo l'analisi · <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>
              </div>
            </>
          )}

          {/* Progress indicator during upload */}
          {isUploading && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Analisi in corso
                </h2>
                <p className="text-muted-foreground">
                  Non chiudere questa pagina
                </p>
              </div>
              
              <ProgressIndicator currentStep={currentStep} />
            </div>
          )}

          {/* Success state - brief before redirect */}
          {uploadedFiles.length > 0 && !isUploading && (
            <Card className="border-success bg-success/5">
              <CardContent className="p-6 text-center space-y-4">
                <CheckCircle className="w-12 h-12 text-success mx-auto" />
                <h3 className="text-xl font-bold text-success">Analisi completata!</h3>
                <p className="text-muted-foreground">
                  Reindirizzamento ai risultati...
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadPage;