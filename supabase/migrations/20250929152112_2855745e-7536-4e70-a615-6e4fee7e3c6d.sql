-- Create feedback table for tester feedback collection
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email TEXT,
  category TEXT NOT NULL CHECK (category IN ('stability', 'ux', 'accuracy', 'design', 'conversion', 'other')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  message TEXT NOT NULL,
  device TEXT CHECK (device IN ('ios', 'android', 'web')),
  version TEXT DEFAULT '0.1.0',
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'implemented', 'closed'))
);

-- Create index for deduplication queries
CREATE INDEX idx_feedback_ip_hash_created ON public.feedback(ip_hash, created_at);

-- Create index for category and rating analysis
CREATE INDEX idx_feedback_category_rating ON public.feedback(category, rating);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Create policy allowing anyone to insert feedback (anonymous feedback allowed)
CREATE POLICY "Anyone can submit feedback" 
ON public.feedback 
FOR INSERT 
WITH CHECK (true);

-- Create policy for reading feedback (admin access only in future)
CREATE POLICY "Public read access for feedback" 
ON public.feedback 
FOR SELECT 
USING (true);