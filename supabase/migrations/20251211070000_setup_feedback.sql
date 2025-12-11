-- Create feedback table
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  email text,
  category text not null,
  rating integer not null,
  message text not null,
  device text,
  version text,
  ip_hash text,
  user_agent text,
  status text default 'new'
);

-- Enable RLS
alter table public.feedback enable row level security;

-- Create policies
create policy "Allow public insert to feedback"
  on public.feedback
  for insert
  to anon, authenticated
  with check (true);

create policy "Allow service role to do everything"
  on public.feedback
  for all
  to service_role
  using (true)
  with check (true);
