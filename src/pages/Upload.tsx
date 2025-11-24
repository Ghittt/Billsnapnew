import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/layout/Header";
import UploadZone from "@/components/upload/UploadZone";
import ProgressIndicator from "@/components/upload/ProgressIndicator";
import { ManualBillInputModal } from "@/components/upload/ManualBillInputModal";
import { ManualBillInputFallback } from "@/components/upload/ManualBillInputFallback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Upload, Shield, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { logError, updateUploadStatus } from "@/lib/errorLogger";
import "@/types/analytics";

// URL dell'edge function OCR su Supabase
// (copiato dalla pagina "Details" di ocr-extract)
const OCR_FUNCTION_URL = "https://jxluygtonamgadgzgyh.supabase.co/functions/v1/ocr-extract";

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
  const navigate = useNavigate();
  const location = useLocation();

  // Se arrivano file dalla Index li mettiamo solo in "staging"
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

    await handleFileUpload(stagedFiles);
  };

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    setCurrentStep("upload");
    setRetryCount(0);
    setOcrTimeoutWarning(false);
    const startTime = Date.now();
    setUploadStartTime(startTime);

    // Analytics
    if (typeof gtag !== "undefined") {
      gtag("event", "upload_started", {
        event_category: "engagement",
        event_label: files[0]?.type || "unknown",
        files_count: files.length,
      });
    }

    try {
      const file = files[0];

      // Validazione peso file
      if (file.size > 20 * 1024 * 1024) {
        await logError({
          type: "validation",
          message: "File troppo grande",
          errorCode: "FILE_TOO_LARGE",
          payload: { fileSize: file.size, fileName: file.name },
        });
        throw new Error("File troppo grande. Massimo 20MB consentiti.");
      }

      // 1) Creo record in uploads PRIMA di chiamare l’OCR
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        throw new Error("Errore durante la creazione del record. Riprova.");
      }

      const uploadId = uploadData.id as string;
      setPendingUploadId(uploadId);

      // Evento upload riuscito
      if (typeof gtag !== "undefined") {
        gtag("event", "upload_succeeded", {
          event_category: "engagement",
        });
      }

      // 2) Aggiorno stato a "processing"
      setCurrentStep("ocr");
      await supabase
        .from("uploads")
        .update({
          ocr_status: "processing",
          ocr_started_at: new Date().toISOString(),
        })
        .eq("id", uploadId);

      // 3) Warning se supera i 30 secondi
      const timeoutWarning = setTimeout(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 30) {
          setOcrTimeoutWarning(true);
        }
      }, 30000);

      // 4) Chiamata all’edge function OCR
      const ocrFormData = new FormData();
      ocrFormData.append("file", file);
      ocrFormData.append("uploadId", uploadId);

      const ocrResponse = await fetch(OCR_FUNCTION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          Accept: "application/json",
        },
        body: ocrFormData,
      });

      clearTimeout(timeoutWarning);
      setOcrTimeoutWarning(false);

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        console.error("OCR failed, status:", ocrResponse.status, errorText);

        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_error: `HTTP ${ocrResponse.status}`,
            ocr_completed_at: new Date().toISOString(),
          })
          .eq("id", uploadId);

        await logError({
          type: "ocr",
          message: `OCR failed with status ${ocrResponse.status}`,
          uploadId,
          errorCode: `HTTP_${ocrResponse.status}`,
          payload: { fileName: file.name, error: errorText },
        });

        throw new Error("Errore durante la lettura della bolletta. Riprova più tardi.");
      }

      const ocrData = await ocrResponse.json();

      await supabase
        .from("uploads")
        .update({
          ocr_status: "success",
          ocr_completed_at: new Date().toISOString(),
        })
        .eq("id", uploadId);

      console.log("OCR response:", ocrData);

      if (!ocrData.success) {
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_error: "OCR returned success=false",
            ocr_completed_at: new Date().toISOString(),
          })
          .eq("id", uploadId);

        await logError({
          type: "ocr",
          message: "OCR returned success=false",
          uploadId,
          payload: { response: ocrData },
        });

        throw new Error("Errore durante la lettura della bolletta. Riprova più tardi.");
      }

      if (typeof gtag !== "undefined") {
        gtag("event", "ocr_completed", {
          event_category: "engagement",
        });
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
        description: "Riprova più tardi.",
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
                <p className="text-lg text-muted-foreground">Carica una o più foto/PDF, poi clicca "Analizza"</p>
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
                <p className="text-muted-foreground">
                  {ocrTimeoutWarning
                    ? "Stiamo ancora elaborando... Qualche secondo in più del solito."
                    : "Non chiudere questa pagina"}
                </p>
              </div>

              <ProgressIndicator currentStep={currentStep} />

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
