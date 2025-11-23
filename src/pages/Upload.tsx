import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import UploadZone from '@/components/upload/UploadZone';
import ProgressIndicator from '@/components/upload/ProgressIndicator';
import { ManualBillInputModal } from '@/components/upload/ManualBillInputModal';
import { ManualBillInputFallback } from '@/components/upload/ManualBillInputFallback';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, Upload, AlertTriangle, Shield, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { logError, updateUploadStatus } from '@/lib/errorLogger';
import heroImage from '@/assets/hero-bg.jpg';
import billIcon from '@/assets/bill-icon.png';
import '@/types/analytics';

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'staged' | 'ocr' | 'calculate' | 'complete'>('upload');
  const [retryCount, setRetryCount] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number>(0);
  const [ocrTimeoutWarning, setOcrTimeoutWarning] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Handle files passed from Index page - don't auto-process
  useEffect(() => {
    if (location.state?.files) {
      handleFileStaging(location.state.files);
    }
  }, [location.state]);

  // Stage files without processing
  const handleFileStaging = (files: File[]) => {
    setStagedFiles(prev => [...prev, ...files]);
    setCurrentStep('staged');
    
    toast({
      title: "File caricati",
      description: `${files.length} file pronti per l'analisi. Clicca "Analizza bolletta" quando sei pronto.`,
    });
  };

  // Start OCR analysis on staged files
  const handleAnalyzeFiles = async () => {
    if (stagedFiles.length === 0) {
      toast({
        title: "Nessun file",
        description: "Carica almeno un file prima di analizzare.",
        variant: "destructive"
      });
      return;
    }

    await handleFileUpload(stagedFiles);
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    setCurrentStep('upload');
    setRetryCount(0);
    setOcrTimeoutWarning(false);
    setUploadStartTime(Date.now());
    
    // Track analytics event
    if (typeof gtag !== 'undefined') {
      gtag('event', 'upload_started', {
        'event_category': 'engagement',
        'event_label': files[0]?.type || 'unknown',
        'files_count': files.length
      });
    }
    
    try {
      // Process all files (for MVP, we'll combine them)
      const file = files[0]; // Process first file for MVP - future: merge PDFs
      
      // Validate file
      if (file.size > 20 * 1024 * 1024) {
        await logError({
          type: 'validation',
          message: 'File troppo grande',
          errorCode: 'FILE_TOO_LARGE',
          payload: { fileSize: file.size, fileName: file.name }
        });
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
        await logError({
          type: 'upload',
          message: 'Storage upload failed',
          errorCode: `HTTP_${uploadResponse.status}`,
          payload: { fileName: file.name }
        });
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
          user_id: user?.id || null,
          ocr_status: 'pending'
        })
        .select()
        .single();

      if (uploadError) {
        await logError({
          type: 'upload',
          message: 'Database insert failed',
          errorCode: uploadError.code || 'DB_ERROR',
          payload: { error: uploadError.message }
        });
        throw uploadError;
      }

      // Track upload success
      if (typeof gtag !== 'undefined') {
        gtag('event', 'upload_succeeded', {
          'event_category': 'engagement'
        });
      }

      // Step 2: OCR Processing with timeout warning
      setCurrentStep('ocr');
      await updateUploadStatus(uploadData.id, 'processing');
      
      // Show timeout warning after 30s
      const timeoutWarning = setTimeout(() => {
        const elapsed = (Date.now() - uploadStartTime) / 1000;
        if (elapsed > 30) {
          setOcrTimeoutWarning(true);
        }
      }, 30000);
      
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

      clearTimeout(timeoutWarning);
      setOcrTimeoutWarning(false);

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error('OCR failed, status:', ocrResponse.status, errorText);
        
        await logError({
          type: 'ocr',
          message: `OCR failed with status ${ocrResponse.status}`,
          uploadId: uploadData.id,
          errorCode: `HTTP_${ocrResponse.status}`,
          payload: { fileName: file.name, error: errorText }
        });
        
        await updateUploadStatus(uploadData.id, 'failed', `HTTP ${ocrResponse.status}`);
        
        // Retry logic for common OCR failures
        if (retryCount < 1 && ocrResponse.status >= 500) {
          console.log(`Retrying OCR (attempt ${retryCount + 1})...`);
          setRetryCount(retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return handleFileUpload(files);
        }
        
        // OCR failed after retries - offer manual fallback
        console.log('OCR failed after retries, showing manual fallback');
        setPendingUploadId(uploadData.id);
        setShowManualFallback(true);
        setIsUploading(false);
        
        toast({
          title: "Bolletta non leggibile",
          description: "Non riusciamo a leggere questa bolletta. Inserisci i dati manualmente per continuare.",
          variant: "destructive"
        });
        
        return;
      }

      const ocrData = await ocrResponse.json();
      await updateUploadStatus(uploadData.id, 'success');
      
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

      // Guard clause: Even if compare fails, show mock results instead of blocking
      if (compareError) {
        console.error('Compare offers error:', compareError);
        
        // Log the error but don't throw
        await logError({
          type: 'network',
          message: 'Compare offers failed, showing mock results',
          uploadId: uploadData.id,
          payload: { error: compareError }
        });
        
        // Show warning but continue with mock data
        toast({
          title: "Analisi parziale",
          description: "Ti mostriamo un esempio. I dati reali potrebbero variare.",
          variant: "default"
        });
        
        // The edge function should have already stored mock results
        // Just proceed to results page
      } else {
        console.log('Offers compared successfully:', compareData);
        
        // Show info if mock results were used
        if (compareData?.is_mock) {
          toast({
            title: "Esempio di analisi",
            description: "Al momento non abbiamo offerte disponibili. Questo è un esempio indicativo.",
            variant: "default"
          });
        }
      }
      
      // Step 4: Complete (AI explanations will be generated in Results page)
      setCurrentStep('complete');
      setUploadedFiles(files);
      
      // Generate AI recommendations, schedule reminders, and save contract in parallel
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser && uploadData.id) {
        Promise.all([
          supabase.functions.invoke('generate-recommendations', {
            body: { upload_id: uploadData.id, user_id: currentUser.id }
          }),
          supabase.functions.invoke('schedule-reminders', {
            body: { user_id: currentUser.id }
          }),
          supabase.functions.invoke('save-contract', {
            body: { upload_id: uploadData.id, user_id: currentUser.id }
          })
        ]).catch(err => {
          console.error('Error in background tasks:', err);
          // Don't block the flow if these fail
        });
      }
      
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
      
      await logError({
        type: 'network',
        message: errorMessage,
        uploadId: pendingUploadId || undefined,
        stackTrace: error instanceof Error ? error.stack : undefined,
        payload: { step: currentStep }
      });
      
      // Show appropriate error message
      if (errorMessage.includes('leggere') || errorMessage.includes('timeout')) {
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
          ) : (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowManualFallback(true)}
            >
              Inserisci manualmente
            </Button>
          )
        });
      } else if (errorMessage.includes('confronto') || errorMessage.includes('offerte')) {
        // If comparison failed, still try to show results page with mock data
        toast({
          title: "Analisi esemplificativa",
          description: "Ti mostriamo un esempio di come apparirà la tua analisi.",
          variant: "default",
        });
        
        // Navigate to results anyway - the compare-offers function should have stored mock data
        if (pendingUploadId) {
          setTimeout(() => {
            navigate(`/results?uploadId=${pendingUploadId}`);
          }, 1500);
        }
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

  const handleManualFallbackSubmit = async (data: {
    provider: string;
    annualKwh: number;
    totalCostEur?: number;
  }) => {
    if (!pendingUploadId) return;

    try {
      setShowManualFallback(false);
      setIsUploading(true);
      setCurrentStep('calculate');

      // Create OCR result with manual data
      const { error: ocrInsertError } = await supabase
        .from("ocr_results")
        .insert({
          upload_id: pendingUploadId,
          annual_kwh: data.annualKwh,
          total_cost_eur: data.totalCostEur,
          provider: data.provider,
          quality_score: 0.6, // Manual input quality score
          tariff_hint: "manual"
        });

      if (ocrInsertError) {
        await logError({
          type: 'validation',
          message: 'Failed to insert manual OCR data',
          uploadId: pendingUploadId,
          payload: { error: ocrInsertError }
        });
        throw ocrInsertError;
      }

      await updateUploadStatus(pendingUploadId, 'success');

      // Continue with comparison
      const { data: compareData, error: compareError } = await supabase.functions.invoke('compare-offers', {
        body: { uploadId: pendingUploadId }
      });

      if (compareError) {
        await logError({
          type: 'network',
          message: 'Compare offers failed',
          uploadId: pendingUploadId,
          payload: { error: compareError }
        });
        throw compareError;
      }

      setCurrentStep('complete');
      
      toast({
        title: "Analisi completata!",
        description: "Confronto offerte completato con i tuoi dati.",
      });

      setTimeout(() => {
        navigate(`/results?uploadId=${pendingUploadId}`);
      }, 1000);

    } catch (error) {
      console.error("Error processing manual fallback:", error);
      toast({
        title: "Errore",
        description: "Errore durante l'elaborazione. Riprova.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setPendingUploadId(null);
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
                  Carica una o più foto/PDF, poi clicca "Analizza"
                </p>
              </div>

              {stagedFiles.length === 0 ? (
                <UploadZone onFileUpload={handleFileStaging} isUploading={false} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      {stagedFiles.length} file caricati
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {stagedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Upload className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm font-medium">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStagedFiles(prev => prev.filter((_, i) => i !== idx))}
                          >
                            Rimuovi
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        onClick={handleAnalyzeFiles} 
                        className="flex-1"
                        size="lg"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Analizza bolletta
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                      >
                        Aggiungi altro
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                <Shield className="w-4 h-4 inline mr-1" />
                Analisi gratuita - Nessun obbligo
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
                  {ocrTimeoutWarning 
                    ? "Stiamo ancora elaborando... Qualche secondo in più del solito."
                    : "Non chiudere questa pagina"
                  }
                </p>
              </div>
              
              <ProgressIndicator currentStep={currentStep} />
              
              {ocrTimeoutWarning && (
                <Card className="glass border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-center text-muted-foreground">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Connessione lenta rilevata. Continua l'elaborazione...
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {showManualFallback && pendingUploadId && (
            <ManualBillInputFallback
              onSubmit={handleManualFallbackSubmit}
              onCancel={() => {
                setShowManualFallback(false);
                setPendingUploadId(null);
              }}
            />
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