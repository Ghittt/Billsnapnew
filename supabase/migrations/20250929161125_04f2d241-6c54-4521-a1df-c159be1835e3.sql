-- Fix critical security vulnerability in uploads table
-- Make user_id required and add proper RLS policies

-- First, ensure all existing uploads have a user_id (set to a default for orphaned records)
-- Note: In production, you'd want to handle orphaned records differently
UPDATE uploads 
SET user_id = gen_random_uuid() 
WHERE user_id IS NULL;

-- Make user_id NOT NULL to enforce proper ownership
ALTER TABLE uploads ALTER COLUMN user_id SET NOT NULL;

-- Drop the dangerous public access policies
DROP POLICY IF EXISTS "Anyone can view uploads" ON uploads;
DROP POLICY IF EXISTS "Anyone can insert uploads" ON uploads;

-- Create secure RLS policies that require authentication
CREATE POLICY "Users can view their own uploads"
ON uploads
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
ON uploads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads"
ON uploads
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
ON uploads
FOR DELETE
USING (auth.uid() = user_id);

-- Also secure the storage bucket for bills
UPDATE storage.buckets 
SET public = false 
WHERE id = 'bills';

-- Create storage policies for secure file access
CREATE POLICY "Users can view their own bill files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own bill files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own bill files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own bill files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'bills' AND auth.uid()::text = (storage.foldername(name))[1]);