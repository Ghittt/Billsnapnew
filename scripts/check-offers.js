import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_anon_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { count, error } = await supabase.from('energy_offers').select('*', { count: 'exact', head: true });
  console.log('Total offers in energy_offers:', count);
  if (error) console.error(error);
}
main();
