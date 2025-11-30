-- Add OCR status tracking columns to uploads table
ALTER TABLE public.uploads 
  ADD COLUMN IF NOT EXISTS ocr_status text CHECK (ocr_status IN ('pending', 'processing', 'success', 'failed')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS ocr_started_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ocr_completed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS ocr_error text;

-- Add comments for clarity
COMMENT ON COLUMN public.uploads.ocr_status IS 'Status of OCR processing: pending, processing, success, or failed';
COMMENT ON COLUMN public.uploads.ocr_started_at IS 'Timestamp when OCR processing started';
COMMENT ON COLUMN public.uploads.ocr_completed_at IS 'Timestamp when OCR processing completed';
COMMENT ON COLUMN public.uploads.ocr_error IS 'Error message if OCR processing failed';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_uploads_ocr_status ON public.uploads(ocr_status);
CREATE INDEX IF NOT EXISTS idx_uploads_ocr_completed_at ON public.uploads(ocr_completed_at DESC);

-- Update RLS policies to allow updates for OCR status
CREATE POLICY "Anyone can update uploads ocr_status" 
  ON public.uploads 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);
