-- Add missing columns to leads table for Call #5 CTA tracking
ALTER TABLE public.leads 
ADD COLUMN provider text,
ADD COLUMN annual_saving_eur numeric,
ADD COLUMN current_annual_cost_eur numeric,
ADD COLUMN offer_annual_cost_eur numeric,
ADD COLUMN utm_medium text,
ADD COLUMN utm_source_new text,
ADD COLUMN device text,
ADD COLUMN ip_hash text,
ADD COLUMN status text DEFAULT 'clicked';

-- Drop the old utm_source column and rename the new one
ALTER TABLE public.leads DROP COLUMN utm_source;
ALTER TABLE public.leads RENAME COLUMN utm_source_new TO utm_source;

-- Create index for deduplication queries
CREATE INDEX idx_leads_deduplication ON public.leads(ip_hash, offer_id, cta_clicked_at);

-- Create index for performance on upload_id
CREATE INDEX idx_leads_upload_id ON public.leads(upload_id);