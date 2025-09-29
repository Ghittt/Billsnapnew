-- Create uploads table for storing bill images/PDFs
CREATE TABLE public.uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create OCR results table
CREATE TABLE public.ocr_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES public.uploads(id) NOT NULL,
  total_cost_eur DECIMAL(10,2),
  annual_kwh DECIMAL(10,2),
  unit_price_eur_kwh DECIMAL(8,4),
  gas_smc DECIMAL(10,2),
  raw_json JSONB,
  quality_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create offers table for energy providers
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  unit_price_eur_kwh DECIMAL(8,4) NOT NULL,
  fixed_fee_eur_mo DECIMAL(6,2) NOT NULL,
  terms_json JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table for savings calculations
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES public.uploads(id) NOT NULL,
  offer_id UUID REFERENCES public.offers(id) NOT NULL,
  annual_cost_offer DECIMAL(10,2) NOT NULL,
  annual_saving_eur DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table for tracking CTA clicks
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID REFERENCES public.uploads(id) NOT NULL,
  offer_id UUID REFERENCES public.offers(id),
  cta_clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  redirect_url TEXT,
  utm_source TEXT,
  utm_campaign TEXT
);

-- Enable Row Level Security
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uploads (allow public access for MVP)
CREATE POLICY "Anyone can insert uploads" ON public.uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view uploads" ON public.uploads FOR SELECT USING (true);

-- RLS Policies for OCR results 
CREATE POLICY "Anyone can insert ocr_results" ON public.ocr_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view ocr_results" ON public.ocr_results FOR SELECT USING (true);

-- RLS Policies for offers (public read access)
CREATE POLICY "Anyone can view offers" ON public.offers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert offers" ON public.offers FOR INSERT WITH CHECK (true);

-- RLS Policies for quotes
CREATE POLICY "Anyone can insert quotes" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view quotes" ON public.quotes FOR SELECT USING (true);

-- RLS Policies for leads
CREATE POLICY "Anyone can insert leads" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view leads" ON public.leads FOR SELECT USING (true);

-- Insert some sample offers
INSERT INTO public.offers (provider, plan_name, unit_price_eur_kwh, fixed_fee_eur_mo, terms_json) VALUES
('Enel Energia', 'E-Light Web', 0.30, 8.50, '{"contract_duration": "24 months", "green_energy": false}'),
('Eni Plenitude', 'Link Basic', 0.28, 9.20, '{"contract_duration": "12 months", "green_energy": true}'),
('Edison', 'Web Luce', 0.32, 7.80, '{"contract_duration": "24 months", "green_energy": false}'),
('A2A Energia', 'Click Luce', 0.29, 8.90, '{"contract_duration": "12 months", "green_energy": true}'),
('Sorgenia', 'Next Energy Luce', 0.31, 8.10, '{"contract_duration": "24 months", "green_energy": false}');

-- Create storage bucket for bill uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('bills', 'bills', false);

-- Storage policies for bill uploads
CREATE POLICY "Anyone can upload bills" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'bills');
CREATE POLICY "Anyone can view bills" ON storage.objects FOR SELECT USING (bucket_id = 'bills');