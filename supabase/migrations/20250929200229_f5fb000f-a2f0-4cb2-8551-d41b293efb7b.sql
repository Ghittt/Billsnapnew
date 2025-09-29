-- Phase 1: Add user_id columns to vulnerable tables
ALTER TABLE ocr_results ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE quotes ADD COLUMN user_id uuid REFERENCES auth.users(id);
ALTER TABLE leads ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Phase 2: Fix uploads table RLS policies
DROP POLICY IF EXISTS "Anyone can view uploads" ON uploads;
DROP POLICY IF EXISTS "Anyone can delete uploads" ON uploads;
DROP POLICY IF EXISTS "Anyone can update uploads" ON uploads;
DROP POLICY IF EXISTS "Anyone can insert uploads" ON uploads;

CREATE POLICY "Users can view own uploads" ON uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own uploads" ON uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads" ON uploads
  FOR DELETE USING (auth.uid() = user_id);

-- Phase 3: Fix ocr_results table RLS policies
DROP POLICY IF EXISTS "Anyone can view ocr_results" ON ocr_results;
DROP POLICY IF EXISTS "Anyone can insert ocr_results" ON ocr_results;

CREATE POLICY "Users can view own ocr_results" ON ocr_results
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert ocr_results" ON ocr_results
  FOR INSERT WITH CHECK (true);

-- Phase 4: Fix quotes table RLS policies
DROP POLICY IF EXISTS "Anyone can view quotes" ON quotes;
DROP POLICY IF EXISTS "Anyone can insert quotes" ON quotes;

CREATE POLICY "Users can view own quotes" ON quotes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert quotes" ON quotes
  FOR INSERT WITH CHECK (true);

-- Phase 5: Fix leads table RLS policies
DROP POLICY IF EXISTS "Anyone can view leads" ON leads;
DROP POLICY IF EXISTS "Anyone can insert leads" ON leads;

CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Phase 6: Create admin role system
CREATE TYPE app_role AS ENUM ('user', 'admin');

CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

-- Phase 7: Update offers table RLS policies
DROP POLICY IF EXISTS "Authenticated users can manage offers" ON offers;
DROP POLICY IF EXISTS "Anyone can view active offers" ON offers;

CREATE POLICY "Anyone can view active offers" ON offers
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage offers" ON offers
  FOR ALL USING (is_admin(auth.uid()));