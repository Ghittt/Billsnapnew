import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import UploadZone from "@/components/upload/UploadZone";
import ProgressIndicator from "@/components/upload/ProgressIndicator";
import { ManualBillInputModal } from "@/components/upload/ManualBillInputModal";
import { ManualBillInputFallback } from "@/components/upload/ManualBillInputFallback";
import { ProfilePopupStep1 } from "@/components/upload/ProfilePopupStep1";
import { ProfilePopupStep2 } from "@/components/upload/ProfilePopupStep2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Upload, Shield, Zap, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logError, updateUploadStatus } from "@/lib/errorLogger";
import "@/types/analytics";

// ======================================================
// CONFIG OCR → Using environment variables
// ======================================================

// Get OCR function URL and anon key from environment variables
const OCR_FUNCTION_URL = import.meta.env.VITE_OCR_FUNCTION_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_OCR_SUPABASE_ANON_KEY || "";

// Debug: Log env var status (Safe logging)
const safeLog = (name: string, value: string | undefined) => {
  if (!value) return console.log(`[ENV CHECK] ${name}: MISSING`);
  console.log(`[ENV CHECK] ${name}: SET (Starts with: ${value.substring(0, 8)}...)`);
};

safeLog("VITE_OCR_FUNCTION_URL", OCR_FUNCTION_URL);
safeLog("VITE_OCR_SUPABASE_ANON_KEY", SUPABASE_ANON_KEY);
safeLog("VITE_SUPABASE_URL", import.meta.env.VITE_SUPABASE_URL);
safeLog("VITE_SUPABASE_PUBLISHABLE_KEY", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<"upload" | "staged" | "ocr" | "calculate" | "complete">("upload");
  const [retryCount, setRetryCount] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const [uploadStartTime, setUploadStartTime] = useState<number>(0);
  const [ocrTimeoutWarning, setOcrTimeoutWarning] = useState(false);
  
  // Pop-up flow states
  const [popupStep, setPopupStep] = useState<0 | 1 | 2>(0);
  const [loaderText, setLoaderText] = useState("Sto analizzando la tua bolletta, ci vuole qualche secondo...");
  const [userProfile, setUserProfile] = useState<{
    dataNascita: string | null;
    nucleoFamiliare: number | null;
    iseeRange: "basso" | "medio" | "alto" | null;
    codiceFiscale: string | null;
  }>({
    dataNascita: null,
    nucleoFamiliare: null,
    iseeRange: null,
    codiceFiscale: null,
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Se arrivano file dalla Index li mettiamo solo in staging
  useEffect(() => {
    if (location.state?.files) {
      handleFileStaging(location.state.files);
    }
  }, [location.state]);

  const handleFileStaging = (files: File[]) => {
    setStagedFiles((prev) => [...prev, ...files]);
    setCurrentStep("staged");

    toast({
      title: "File caricati",
      description: `${files.length} file pronti per l'analisi. Clicca "Analizza bolletta" quando sei pronto.`,
    });
  };

  const handleAnalyzeFiles = async () => {
    if (stagedFiles.length === 0) {
      toast({
        title: "Nessun file",
        description: "Carica almeno un file prima di analizzare.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setLoaderText("Sto analizzando la tua bolletta, ci vuole qualche secondo...");
    setPopupStep(1); // Show first pop-up
  };

  // Handle Pop-up Step 1 completion
  const handlePopupStep1Complete = (dataNascita: string) => {
    setUserProfile(prev => ({ ...prev, dataNascita }));
    setPopupStep(2); // Move to second pop-up
  };

  // Handle Pop-up Step 2 completion - NOW start actual OCR
  const handlePopupStep2Complete = async (data: { nucleoFamiliare: number; iseeRange: "basso" | "medio" | "alto" }) => {
    setUserProfile(prev => ({ ...prev, ...data }));
    setPopupStep(0); // Close pop-ups
    setLoaderText("Sto finalizzando la tua analisi...");
    
    // NOW start the actual file upload and OCR
    await handleFileUpload(stagedFiles);
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    setCurrentStep("upload");
    setRetryCount(0);
    setOcrTimeoutWarning(false);
    const startTime = Date.now();
    setUploadStartTime(startTime);

    if (typeof gtag !== "undefined") {
      gtag("event", "upload_started", {
        event_category: "engagement",
        event_label: files[0]?.type || "unknown",
        files_count: files.length,
      });
    }

    try {
      const file = files[0];

      // 1) validazione peso
      if (file.size > 20 * 1024 * 1024) {
        await logError({
          type: "validation",
          message: "File troppo grande",
          errorCode: "FILE_TOO_LARGE",
          payload: { fileSize: file.size, fileName: file.name },
        });
        throw new Error("File troppo grande. Massimo 20MB consentiti.");
      }

      // 2) creo record in uploads PRIMA dell’OCR
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.warn("No auth user (anon upload)", authError.message);
      }

      const user = authData?.user ?? null;

      const { data: uploadData, error: uploadError } = await supabase
        .from("uploads")
        .insert({
          file_url: `bills/${Date.now()}-${file.name}`,
          file_type: file.type,
          file_size: file.size,
          user_id: user?.id || null,
          ocr_status: "pending",
        })
        .select()
        .single();

      if (uploadError || !uploadData) {
        await logError({
          type: "upload",
          message: "Database insert failed",
          errorCode: uploadError?.code || "DB_ERROR",
          payload: { error: uploadError?.message },
        });
        // MODIFIED: Show specific DB error
        throw new Error(`Errore DB: ${uploadError?.message || "Dati mancanti"} (Code: ${uploadError?.code})`);
      }

      const uploadId = uploadData.id as string;
      setPendingUploadId(uploadId);

      if (typeof gtag !== "undefined") {
        gtag("event", "upload_succeeded", {
          event_category: "engagement",
        });
      }

      // 3) aggiorno stato a processing
      setCurrentStep("ocr");
      await supabase
        .from("uploads")
        .update({
          ocr_status: "processing",
          ocr_started_at: new Date().toISOString(),
        })
        .eq("id", uploadId);

      // 4) warning dopo 30 secondi
      const timeoutWarning = setTimeout(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 30) {
          setOcrTimeoutWarning(true);
        }
      }, 30000);

      // 5) chiamata edge function OCR (convert file to base64 for invoke)
      console.log("Calling OCR function via supabase.functions.invoke...");
      
      // Convert File to baseURL reader to get clean base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]; // Remove data:...;base64, prefix
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      console.log(`[Upload] File converted to base64, size: ${fileBase64.length} chars`);

      const { data: ocrData, error: ocrError } = await supabase.functions.invoke("ocr-extract", {
        body: {
          fileBase64: fileBase64,
          fileName: file.name,
          fileType: file.type,
          uploadId: uploadId,
        },
      });
      clearTimeout(timeoutWarning);
      clearTimeout(timeoutWarning);
      setOcrTimeoutWarning(false);

      if (ocrError) {
        console.error("=== OCR INVOKE ERROR START ===");
        console.error("Full error object:", JSON.stringify(ocrError, null, 2));
        console.error("Error message:", ocrError.message);
        console.error("Error name:", ocrError.name);
        console.error("Error context:", ocrError.context);
        console.error("=== OCR INVOKE ERROR END ===");
        
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_error: `${ocrError.name}: ${ocrError.message || "Unknown error"}`,
            ocr_completed_at: new Date().toISOString(),
          })
          .eq("id", uploadId);

        await logError({
          type: "ocr",
          message: "OCR invoke failed",
          uploadId,
          errorCode: "INVOKE_ERROR",
          payload: { 
            error: ocrError,
            errorString: JSON.stringify(ocrError),
            fileName: file.name,
            fileSize: file.size,
          },
        });

        throw new Error(`Errore OCR: ${ocrError.message || "Errore di connessione"}. Controlla la console per dettagli.`);
      }

      console.log("=== OCR SUCCESS ===");
      console.log("Response data:", ocrData);

      const ocrResponseData = ocrData; // Rename for clarity

      await supabase
        .from("uploads")
        .update({
          ocr_status: "success",
          ocr_completed_at: new Date().toISOString(),
        })
        .eq("id", uploadId);

      console.log("OCR response:", ocrResponseData);

      // Backend returns the data directly, or { error: ... } on failure
      if (ocrResponseData.error) {
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_error: ocrResponseData.error || "Unknown OCR error",
            ocr_completed_at: new Date().toISOString(),
          })
          .eq("id", uploadId);

        await logError({
          type: "ocr",
          message: "OCR returned error",
          uploadId,
          payload: { response: ocrResponseData },
        });

        throw new Error(ocrResponseData.error || "Errore durante la lettura della bolletta.");
      }

      if (typeof gtag !== "undefined") {
        gtag("event", "ocr_completed", {
          event_category: "engagement",
        });
      }

      // Call compare-offers to analyze and save offer recommendations
      console.log("Calling compare-offers for upload:", uploadId);
      const { data: compareData, error: compareError } = await supabase.functions.invoke("compare-offers", {
        body: { uploadId },
      });

      if (compareError) {
        console.error("Compare offers error:", compareError);
        await logError({
          type: "network",
          message: "Compare offers failed",
          uploadId,
          payload: { error: compareError },
        });
      } else {
        console.log("Offers compared successfully:", compareData);
      }


      setCurrentStep("complete");
      setUploadedFiles(files);

      if (typeof gtag !== "undefined") {
        gtag("event", "result_shown", {
          event_category: "engagement",
        });
      }

      setTimeout(() => {
        navigate(`/results?uploadId=${uploadId}`);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Errore durante la lettura della bolletta. Riprova più tardi.";

      await logError({
        type: "ocr",
        message: errorMessage,
        uploadId: pendingUploadId || undefined,
        stackTrace: error instanceof Error ? error.stack : undefined,
        payload: { step: currentStep },
      });

      toast({
        title: "Errore durante la lettura della bolletta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualFallbackSubmit = async (data: { provider: string; annualKwh: number; totalCostEur?: number }) => {
    if (!pendingUploadId) return;

    try {
      setShowManualFallback(false);
      setIsUploading(true);
      setCurrentStep("calculate");

      const { error: ocrInsertError } = await supabase.from("ocr_results").insert({
        upload_id: pendingUploadId,
        annual_kwh: data.annualKwh,
        total_cost_eur: data.totalCostEur,
        provider: data.provider,
        quality_score: 0.6,
        tariff_hint: "manual",
      });

      if (ocrInsertError) {
        await logError({
          type: "validation",
          message: "Failed to insert manual OCR data",
          uploadId: pendingUploadId,
          payload: { error: ocrInsertError },
        });
        throw ocrInsertError;
      }

      await updateUploadStatus(pendingUploadId, "success");

      const { data: compareData, error: compareError } = await supabase.functions.invoke("compare-offers", {
        body: { uploadId: pendingUploadId },
      });

      if (compareError) {
        await logError({
          type: "network",
          message: "Compare offers failed",
          uploadId: pendingUploadId,
          payload: { error: compareError },
        });
        throw compareError;
      }

      console.log("Offers compared successfully (manual fallback):", compareData);

      setCurrentStep("complete");

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
      setCurrentStep("calculate");

      await supabase.from("bills").insert({
        fields_json: fields,
        raw_text: "Manual input",
      });

      const { error: ocrInsertError } = await supabase.from("ocr_results").insert({
        upload_id: pendingUploadId,
        annual_kwh: fields.kwh_period,
        f1_kwh: fields.f1_kwh,
        f2_kwh: fields.f2_kwh,
        f3_kwh: fields.f3_kwh,
        potenza_kw: fields.potenza_kw,
        total_cost_eur: fields.fixed_fee_month * 12,
        quality_score: 0.5,
        tariff_hint: "manual",
      });

      if (ocrInsertError) throw ocrInsertError;

      const { data: compareData, error: compareError } = await supabase.functions.invoke("compare-offers", {
        body: { uploadId: pendingUploadId },
      });

      if (compareError) throw compareError;

      console.log("Offers compared successfully (manual input):", compareData);

      setCurrentStep("complete");

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
                <h1 className="text-4xl font-semibold">Analizza la tua bolletta</h1>
                <p className="text-lg text-muted-foreground">
                  Carica una o più foto/PDF, poi clicca &quot;Analizza&quot;
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
                              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            Rimuovi
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={handleAnalyzeFiles} className="flex-1" size="lg">
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
                <h2 className="text-2xl font-semibold mb-2">Analisi in corso</h2>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <p className="text-muted-foreground">
                  {loaderText}
                </p>
              </div>

              {popupStep === 0 && <ProgressIndicator currentStep={currentStep} />}

              {ocrTimeoutWarning && (
                <Card className="glass border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-sm text-center text-muted-foreground">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Connessione lenta rilevata. Continua l&apos;elaborazione...
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
                <p className="text-muted-foreground">Caricamento risultati...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      
      {/* Pop-up Step 1: Birth Date */}
      <ProfilePopupStep1
        open={popupStep === 1}
        codiceFiscale={userProfile.codiceFiscale}
        onNext={handlePopupStep1Complete}
      />

      {/* Pop-up Step 2: Household */}
      <ProfilePopupStep2
        open={popupStep === 2}
        onComplete={handlePopupStep2Complete}
      />

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
// Force rebuild Fri Dec  5 11:14:54 CET 2025
