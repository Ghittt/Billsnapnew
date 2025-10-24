-- Add login_type column to notification_subscriptions table
ALTER TABLE public.notification_subscriptions 
ADD COLUMN IF NOT EXISTS login_type TEXT CHECK (login_type IN ('google', 'apple', 'email'));