-- Allow public access to uploads, ocr_results, and quotes for anonymous users
-- Keep admin-only access for offers management
-- Keep user privacy for leads

-- Fix uploads table - allow anonymous uploads
DROP POLICY IF EXISTS "Users can view own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON uploads;

CREATE POLICY "Anyone can insert uploads" ON uploads
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view uploads" ON uploads
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update uploads" ON uploads
  FOR UPDATE USING (true);

-- Fix ocr_results table - allow anonymous access
DROP POLICY IF EXISTS "Users can view own ocr_results" ON ocr_results;
DROP POLICY IF EXISTS "System can insert ocr_results" ON ocr_results;

CREATE POLICY "Anyone can view ocr_results" ON ocr_results
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert ocr_results" ON ocr_results
  FOR INSERT WITH CHECK (true);

-- Fix quotes table - allow anonymous access
DROP POLICY IF EXISTS "Users can view own quotes" ON quotes;
DROP POLICY IF EXISTS "System can insert quotes" ON quotes;

CREATE POLICY "Anyone can view quotes" ON quotes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert quotes" ON quotes
  FOR INSERT WITH CHECK (true);

-- Keep leads restricted - these contain sensitive conversion data
-- The existing policies are fine