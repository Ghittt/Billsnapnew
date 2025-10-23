-- Allow anonymous email subscriptions by making user_id nullable
-- and adding a policy for anonymous inserts
ALTER TABLE public.notification_subscriptions 
ALTER COLUMN user_id DROP NOT NULL;

-- Create policy for anonymous email subscriptions
CREATE POLICY "Anyone can insert email subscriptions"
ON public.notification_subscriptions
FOR INSERT
WITH CHECK (true);

-- Drop the old insert policy that required auth
DROP POLICY IF EXISTS "Users can insert their own notification subscriptions" ON public.notification_subscriptions;