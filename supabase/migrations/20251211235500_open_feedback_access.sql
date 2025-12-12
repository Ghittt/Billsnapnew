-- Allow public access to feedback table (Security through obscurity as requested)
-- This allows the Admin Dashboard to Read, Update (Approve), and Delete reviews without login.

create policy "Allow public select on feedback"
  on public.feedback
  for select
  to anon, authenticated
  using (true);

create policy "Allow public update on feedback"
  on public.feedback
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "Allow public delete on feedback"
  on public.feedback
  for delete
  to anon, authenticated
  using (true);
