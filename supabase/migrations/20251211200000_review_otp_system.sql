-- Migration: Email OTP verification system for reviews
-- Created: 2025-12-11

-- Create table for OTP codes
CREATE TABLE IF NOT EXISTS public.review_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  ip_address TEXT
);

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_otp_email_code ON public.review_otp_codes(email, code);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON public.review_otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verified ON public.review_otp_codes(verified);

-- Enable RLS
ALTER TABLE public.review_otp_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Allow public insert for OTP codes" ON public.review_otp_codes;
CREATE POLICY "Allow public insert for OTP codes"
  ON public.review_otp_codes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select for verification" ON public.review_otp_codes;
CREATE POLICY "Allow public select for verification"
  ON public.review_otp_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow public update for verification" ON public.review_otp_codes;
CREATE POLICY "Allow public update for verification"
  ON public.review_otp_codes
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Update feedback table
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verification_code_id UUID REFERENCES public.review_otp_codes(id);

-- Comments
COMMENT ON TABLE public.review_otp_codes IS 'Stores OTP codes for email verification of reviews';
COMMENT ON COLUMN public.review_otp_codes.code IS '6-digit verification code';
COMMENT ON COLUMN public.review_otp_codes.expires_at IS 'Code expiry time (10 minutes from creation)';
COMMENT ON COLUMN public.review_otp_codes.attempts IS 'Number of verification attempts (max 5)';
