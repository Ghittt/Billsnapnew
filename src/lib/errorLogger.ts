import { supabase } from "@/integrations/supabase/client";

export type ErrorType = 'ocr' | 'openai' | 'oauth' | 'network' | 'validation' | 'upload';

interface LogErrorParams {
  type: ErrorType;
  message: string;
  uploadId?: string;
  userId?: string;
  errorCode?: string;
  stackTrace?: string;
  payload?: Record<string, any>;
}

export const logError = async ({
  type,
  message,
  uploadId,
  userId,
  errorCode,
  stackTrace,
  payload
}: LogErrorParams) => {
  try {
    // Log to console in development
    if (import.meta.env.DEV) {
      console.error(`[${type.toUpperCase()}] ${message}`, {
        uploadId,
        userId,
        errorCode,
        payload
      });
    }

    // Save to Supabase
    const { error } = await supabase
      .from('errors')
      .insert({
        error_type: type,
        error_message: message,
        upload_id: uploadId || null,
        user_id: userId || null,
        error_code: errorCode || null,
        stack_trace: stackTrace || null,
        payload: payload || null
      });

    if (error) {
      console.error('Failed to log error to database:', error);
    }
  } catch (err) {
    // Fail silently to avoid infinite error loops
    console.error('Error logger failed:', err);
  }
};

export const updateUploadStatus = async (
  uploadId: string,
  status: 'pending' | 'processing' | 'success' | 'failed',
  error?: string
) => {
  try {
    const updateData: any = {
      ocr_status: status
    };

    if (status === 'processing') {
      updateData.ocr_started_at = new Date().toISOString();
    } else if (status === 'success' || status === 'failed') {
      updateData.ocr_completed_at = new Date().toISOString();
    }

    if (error) {
      updateData.ocr_error = error;
    }

    const { error: updateError } = await supabase
      .from('uploads')
      .update(updateData)
      .eq('id', uploadId);

    if (updateError) {
      console.error('Failed to update upload status:', updateError);
    }
  } catch (err) {
    console.error('Update upload status failed:', err);
  }
};
