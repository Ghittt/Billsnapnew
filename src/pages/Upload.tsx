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
import { CheckCircle, Clock, Upload, Shield, Zap, Loader2, Plus } from "lucide-react";
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
    tipoUtenza: "casa" | "ufficio";
  const [userProfile, setUserProfile] = useState<{
    dataNascita: string | null;
    nucleoFamiliare: number | null;
    iseeRange: "basso" | "medio" | "alto" | null;
    codiceFiscale: string | null;
    tipoUtenza: "casa",
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
    // START IMMEDIATELY - ADDRESSING "ONE CLICK" REQUEST
    await handleFileUpload(stagedFiles);
  };

  // Handle Pop-up Step 1 completion
  const handlePopupStep1Complete = (dataNascita: string) => {
    setUserProfile(prev => ({ ...prev, dataNascita }));
    setPopupStep(2); // Move to second pop-up
  };

  // Handle Pop-up Step 2 completion - NOW start actual OCR
  const handlePopupStep2Complete = async (data: { nucleoFamiliare: number; iseeRange: "basso" | "medio" | "alto"; tipoUtenza: "casa" | "ufficio" }) => {
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
        event_label: "multi_file", // Updated label
        files_count: files.length,
      });
    }

    try {
      // 1) Validation: Check total size or individual size
      let totalSize = 0;
      for (const f of files) {
          if (f.size > 10 * 1024 * 1024) throw new Error(`File ${f.name} troppo grande (max 10MB)`);
          totalSize += f.size;
      }
      // Enforce 15MB total limit for safety
      if (totalSize > 15 * 1024 * 1024) throw new Error("Dimensione totale file troppo grande (max 15MB)");

      const primaryFile = files[0];
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.warn("No auth user (anon upload)", authError.message);
      }
      const user = authData?.user ?? null;

      // 2) Create upload record (One record for the batch associated with primary file metadata)
      const { data: uploadData, error: uploadError } = await supabase
        .from("uploads")
        .insert({
          file_url: `bills/${Date.now()}_batch_${files.length}_files`, // New naming
          file_type: "batch/" + files.length,
          file_size: totalSize,
          user_id: user?.id || null,
          ocr_status: "pending",
          tipo_utenza: userProfile.tipoUtenza === "casa" ? "domestico" : "business",
          data_nascita: userProfile.dataNascita ? (() => { const p = userProfile.dataNascita.split("/"); return p.length === 3 ? `${p[2]}-${p[1]}-${p[0]}` : null; })() : null,
          nucleo_familiare: userProfile.nucleoFamiliare,
          isee_range: userProfile.iseeRange,
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
        throw new Error(`Errore DB: ${uploadError?.message || "Dati mancanti"} (Code: ${uploadError?.code})`);
      }

      const uploadId = uploadData.id as string;
      setPendingUploadId(uploadId);

      // 3) Update status
      setCurrentStep("ocr");
      await supabase
        .from("uploads")
        .update({ ocr_status: "processing", ocr_started_at: new Date().toISOString() })
        .eq("id", uploadId);

      // Warning timeout
      const timeoutWarning = setTimeout(() => {
         if ((Date.now() - startTime) / 1000 > 30) setOcrTimeoutWarning(true);
      }, 30000);

      // 4) Convert ALL files to Base64
      console.log(`[Upload] Converting ${files.length} files to base64...`);
      const filesPayload = await Promise.all(files.map(async (file) => {
        return new Promise<{ mimeType: string, data: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ mimeType: file.type, data: base64 });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
      }));

      // 5) Call OCR Edge Function
      console.log(`[Upload] Sending ${filesPayload.length} images to OCR...`);
      const { data: ocrData, error: ocrError } = await supabase.functions.invoke("ocr-extract", {
        body: {
          files: filesPayload, // NEW: Send array
          uploadId: uploadId,
        },
      });

      clearTimeout(timeoutWarning);
      setOcrTimeoutWarning(false);

      if (ocrError) {
        console.error("OCR Error:", ocrError);
        // Important: Log error in DB so we know what happened
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_error: `${ocrError.name}: ${ocrError.message || "Unknown error"}`,
            ocr_completed_at: new Date().toISOString(),
          })
          .eq("id", uploadId);

        throw new Error(`Errore OCR: ${ocrError.message || "Errore di connessione"}`);
      }

      const ocrResponseData = ocrData;
      console.log("=== OCR SUCCESS ===", ocrResponseData);

      if (ocrResponseData.error) {
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_error: ocrResponseData.error,
            ocr_completed_at: new Date().toISOString(),
          })
          .eq("id", uploadId);
         throw new Error(ocrResponseData.error || "Errore durante la lettura della bolletta.");
      }

      await supabase
        .from("uploads")
        .update({ ocr_status: "success", ocr_completed_at: new Date().toISOString() })
        .eq("id", uploadId);

      if (typeof gtag !== "undefined") {
        gtag("event", "ocr_completed", { event_category: "engagement" });
      }

      // 6) Compare Offers
      console.log("Calling compare-offers...");
      const { error: compareError } = await supabase.functions.invoke("compare-offers", { body: { uploadId } });
      
      if(compareError) console.error("Compare error:", compareError);

      setCurrentStep("complete");
      setUploadedFiles(files);
      setStagedFiles([]); // Clear staging

      if (typeof gtag !== "undefined") {
        gtag("event", "result_shown", {
          event_category: "engagement",
        });
      }

      setTimeout(() => {
        navigate(`/results?uploadId=${uploadId}`);
      }, 1000);

    } catch (error) {
      console.error("Upload process error:", error);
      const errorMessage = error instanceof Error ? error.message : "Errore generico upload";
      
      if (pendingUploadId) {
          await supabase.from("uploads").update({ 
              ocr_status: "failed", 
              ocr_error: errorMessage 
          }).eq("id", pendingUploadId);
      }

      await logError({
        type: "ocr",
        message: errorMessage,
        uploadId: pendingUploadId || undefined,
        stackTrace: error instanceof Error ? error.stack : undefined,
      });

      toast({
        title: "Errore Upload",
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
                          <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                            <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStagedFiles((prev) => prev.filter((_, i) => i !== idx))}
                            className="flex-shrink-0"
                          >
                            Rimuovi
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button onClick={handleAnalyzeFiles} className="flex-1 w-full" size="lg">
                        <Zap className="w-4 h-4 mr-2" />
                        Analizza bolletta ({stagedFiles.length})
                      </Button>
                      <div className="relative w-full sm:w-auto">
                        <input
                          type="file"
                          multiple
                          accept="image/*,.pdf"
                          className="hidden"
                          id="add-more-input"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleFileStaging(Array.from(e.target.files));
                            }
                            // Reset val so same file can be selected again if needed
                            e.target.value = '';
                          }}
                        />
                        <Button
                          variant="outline"
                          size="lg"
                          onClick={() => document.getElementById("add-more-input")?.click()}
                          title="Aggiungi altre pagine"
                          className="w-full sm:w-auto"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Aggiungi altro
                        </Button>
                      </div>
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
