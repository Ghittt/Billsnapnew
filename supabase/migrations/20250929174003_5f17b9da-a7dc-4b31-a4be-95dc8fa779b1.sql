-- Make uploads work without authentication for MVP
-- Allow user_id to be nullable for anonymous uploads
ALTER TABLE public.uploads ALTER COLUMN user_id DROP NOT NULL;

-- Drop the restrictive authentication policies
DROP POLICY IF EXISTS "Users can view their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can insert their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can update their own uploads" ON public.uploads;
DROP POLICY IF EXISTS "Users can delete their own uploads" ON public.uploads;

-- Create permissive policies for MVP (allow anonymous access)
CREATE POLICY "Anyone can insert uploads"
ON public.uploads
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view uploads"
ON public.uploads
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update uploads"
ON public.uploads
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete uploads"
ON public.uploads
FOR DELETE
USING (true);