-- Create errors table for logging and observability
CREATE TABLE IF NOT EXISTS public.errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  upload_id UUID REFERENCES public.uploads(id),
  error_type TEXT NOT NULL, -- 'ocr', 'openai', 'oauth', 'network', 'validation'
  error_code TEXT,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  payload JSONB, -- minimized payload for debugging
  user_id UUID,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.errors ENABLE ROW LEVEL SECURITY;

-- Policy: System can insert errors
CREATE POLICY "System can insert errors" ON public.errors
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can view all errors
CREATE POLICY "Admins can view errors" ON public.errors
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Add indexes for performance
CREATE INDEX idx_errors_upload_id ON public.errors(upload_id);
CREATE INDEX idx_errors_created_at ON public.errors(created_at DESC);
CREATE INDEX idx_errors_type ON public.errors(error_type);
CREATE INDEX idx_errors_resolved ON public.errors(resolved) WHERE resolved = false;

-- Add ocr_status and ocr_error fields to uploads table
ALTER TABLE public.uploads 
ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'success', 'failed'
ADD COLUMN IF NOT EXISTS ocr_error TEXT,
ADD COLUMN IF NOT EXISTS ocr_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ocr_completed_at TIMESTAMP WITH TIME ZONE;

-- Add provider_login to notification_subscriptions (if not exists)
ALTER TABLE public.notification_subscriptions
ADD COLUMN IF NOT EXISTS provider_login TEXT;