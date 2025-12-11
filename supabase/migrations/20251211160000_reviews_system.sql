-- Migration: Extend feedback table for review system
-- Created: 2025-12-11

-- Add review-specific columns to feedback table
ALTER TABLE public.feedback 
ADD COLUMN IF NOT EXISTS review_name TEXT,
ADD COLUMN IF NOT EXISTS review_location TEXT,
ADD COLUMN IF NOT EXISTS review_stars INTEGER CHECK (review_stars >= 1 AND review_stars <= 5),
ADD COLUMN IF NOT EXISTS review_text TEXT,
ADD COLUMN IF NOT EXISTS instagram_username TEXT,
ADD COLUMN IF NOT EXISTS facebook_username TEXT,
ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
ADD COLUMN IF NOT EXISTS uploaded_photo_url TEXT,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS show_in_carousel BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_approved ON public.feedback(is_approved, show_in_carousel);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback(created_at DESC);

-- Add RLS policy for admin to manage reviews
CREATE POLICY IF NOT EXISTS "Allow admin to update reviews"
  ON public.feedback
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON COLUMN public.feedback.review_name IS 'Name of the reviewer (for public display)';
COMMENT ON COLUMN public.feedback.review_location IS 'Location of the reviewer';
COMMENT ON COLUMN public.feedback.review_stars IS 'Star rating (1-5)';
COMMENT ON COLUMN public.feedback.review_text IS 'Review text content';
COMMENT ON COLUMN public.feedback.instagram_username IS 'Instagram username for profile photo capture';
COMMENT ON COLUMN public.feedback.facebook_username IS 'Facebook username for profile photo capture';
COMMENT ON COLUMN public.feedback.profile_photo_url IS 'URL of captured social media profile photo';
COMMENT ON COLUMN public.feedback.uploaded_photo_url IS 'URL of manually uploaded photo';
COMMENT ON COLUMN public.feedback.is_approved IS 'Whether review is approved by admin';
COMMENT ON COLUMN public.feedback.show_in_carousel IS 'Whether to show in public reviews carousel';
