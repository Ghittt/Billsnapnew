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

// URL dell'Edge Function OCR su Supabase (production)
const OCR_FUNCTION_URL =
  "https://jxluygtonamgadgzgyh.supabase.co/functions/v1/ocr-extract";

// ANON KEY di Supabase (ok usarla nel frontend)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE";

const UploadPage = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "upload" | "staged" | "ocr" | "calculate" | "complete"
  >("upload");
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

    // Analytics: upload iniziato
    if (typeof gtag !== "undefined") {
      gtag("event", "upload_started", {
        event_category: "engagement",
        event_label: files[0]?.type || "unknown",
        files_count: files.length,
      });
    }

    try {
      const file = files[0];

      // 0) Validazione dimensione file
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
      const { data: authData } = await supabase.auth.getUser();
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
        throw new Error("Errore durante la creazione del record. Riprova.");
      }

      const uploadId = uploadData.id as string;
      setPendingUploadId(uploadId);

      // Analytics: upload riuscito
      if (typeof gtag !== "undefined") {
        gtag("event", "upload_succeeded", {
          event_category: "engagement",
        });
      }

      // 2) Aggiorno status a "processing"
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

      // 4) Chiamata all’Edge Function OCR (multipart)
      const ocrFormData = new FormData();
      ocrFormData.append("file", file);
      ocrFormData.append("uploadId", uploadId);

      const ocrResponse = await fetch(OCR_FUNCTION_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: "application/json",
        },
        body: ocrFormData,
      });

      clearTimeout(timeoutWarning);
      setOcrTimeoutWarning(false);

      if (!ocrResponse.ok) {
        const errorText = await ocrResponse.text();
        await logError({
          type: "ocr",
          message: `OCR failed: ${errorText}`,
          uploadId,
          errorCode: ocrResponse.status.toString(),
          payload: { errorText },
        });
        
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_completed_at: new Date().toISOString(),
            ocr_error: errorText,
          })
          .eq("id", uploadId);

        throw new Error("Errore durante la lettura della bolletta. Riprova più tardi.");
      }

      const ocrResult = await ocrResponse.json();

      if (!ocrResult.success) {
        await logError({
          type: "ocr",
          message: "OCR returned success=false",
          uploadId,
          payload: ocrResult,
        });
        
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_completed_at: new Date().toISOString(),
            ocr_error: ocrResult.error || "Unknown error",
          })
          .eq("id", uploadId);

        throw new Error("Errore durante la lettura della bolletta. Riprova più tardi.");
      }

      // 5) Aggiorno status a "success"
      await supabase
        .from("uploads")
        .update({
          ocr_status: "success",
          ocr_completed_at: new Date().toISOString(),
        })
        .eq("id", uploadId);

      setCurrentStep("complete");
      
      // Analytics: OCR completato
      if (typeof gtag !== "undefined") {
        gtag("event", "ocr_completed", {
          event_category: "engagement",
          duration_seconds: Math.round((Date.now() - startTime) / 1000),
        });
      }

      // 6) Redirect alla pagina risultati
      navigate(`/results?uploadId=${uploadId}`);

    } catch (error: any) {
      console.error("Upload error:", error);
      
      const uploadId = pendingUploadId;
      if (uploadId) {
        await supabase
          .from("uploads")
          .update({
            ocr_status: "failed",
            ocr_completed_at: new Date().toISOString(),
            ocr_error: error.message,
          })
          .eq("id", uploadId);
      }

      await logError({
        type: "ocr",
        message: error.message || "Unknown error",
        uploadId: uploadId || undefined,
        payload: { step: currentStep },
      });

      toast({
        title: "Errore",
        description: error.message || "Errore durante la lettura della bolletta. Riprova più tardi.",
        variant: "destructive",
      });

      setIsUploading(false);
      setCurrentStep("upload");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-foreground">
            Carica la tua bolletta
          </h1>
          <p className="text-lg text-muted-foreground">
            Analisi gratuita - Nessun obbligo
          </p>
        </div>

        <UploadZone
          onFileUpload={handleFileStaging}
          isUploading={isUploading}
        />

        {stagedFiles.length > 0 && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>File pronti per l'analisi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stagedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{file.name}</span>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleAnalyzeFiles}
                  disabled={isUploading}
                  className="w-full mt-4"
                  size="lg"
                >
                  {isUploading ? "Analisi in corso..." : "Analizza bolletta"}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {isUploading && (
          <div className="mt-6">
            <ProgressIndicator currentStep={currentStep} />
            {ocrTimeoutWarning && (
              <Card className="mt-4 border-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Clock className="h-5 w-5" />
                    <p className="text-sm">
                      L'analisi sta richiedendo più tempo del previsto. Stiamo ancora lavorando...
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <Upload className="h-8 w-8 mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Upload facile</h3>
              <p className="text-sm text-muted-foreground">
                Carica la tua bolletta PDF o foto
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Zap className="h-8 w-8 mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Analisi AI</h3>
              <p className="text-sm text-muted-foreground">
                SnapAI™ legge e analizza automaticamente
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Shield className="h-8 w-8 mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Dati sicuri</h3>
              <p className="text-sm text-muted-foreground">
                Protetti e gestiti secondo GDPR
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ManualBillInputModal
        open={showManualInput}
        onClose={() => setShowManualInput(false)}
        onSubmit={(data) => {
          console.log("Manual input:", data);
          setShowManualInput(false);
        }}
      />

      {showManualFallback && (
        <ManualBillInputFallback
          onSubmit={(data) => {
            console.log("Manual fallback:", data);
            setShowManualFallback(false);
          }}
          onCancel={() => setShowManualFallback(false)}
        />
      )}
    </div>
  );
};

export default UploadPage;