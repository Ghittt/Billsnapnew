-- Fix search path for update_collective_count function
CREATE OR REPLACE FUNCTION update_collective_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.collective_stats
  SET current_count = (SELECT COUNT(*) FROM public.collective_signups),
      updated_at = now()
  WHERE id = 1;
  RETURN NEW;
END;
$$;