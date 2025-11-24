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
        const errorText =