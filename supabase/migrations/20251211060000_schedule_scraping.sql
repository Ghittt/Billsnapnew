-- Enable extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule scraping job
-- Runs at 6:00 AM every 3 days.
-- Using the ANON key found in environment for authorization.
select cron.schedule(
  'scraping-3days',
  '0 6 */3 * *',
  $$
  select
    net.http_post(
      url:='https://jxluygtonamgadqgzgyh.supabase.co/functions/v1/sync-offers',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bHV5Z3RvbmFtZ2FkcWd6Z3loIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMzA5OTAsImV4cCI6MjA2ODcwNjk5MH0.ZpnarbyN_zvScN0xuv-wx8QSWLtDxUbowcTf0bb2HSE"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
