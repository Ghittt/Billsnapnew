import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySupabase() {
  console.log('Verifying Supabase connection...');

  const { data: uploads, error: uploadsError } = await supabase
    .from('uploads')
    .select('*')
    .limit(1);

  if (uploadsError) {
    console.error('Error connecting to "uploads" table:', uploadsError.message);
  } else {
    console.log('Successfully connected to "uploads" table.');
  }

  const { data: ocrResults, error: ocrError } = await supabase
    .from('ocr_results')
    .select('*')
    .limit(1);

  if (ocrError) {
    console.error('Error connecting to "ocr_results" table:', ocrError.message);
  } else {
    console.log('Successfully connected to "ocr_results" table.');
  }

  const { data: ocrDebug, error: debugError } = await supabase
    .from('ocr_debug')
    .select('*')
    .limit(1);

    if (debugError) {
        console.warn('Warning: "ocr_debug" table might be missing or inaccessible:', debugError.message);
    } else {
        console.log('Successfully connected to "ocr_debug" table.');
    }
  
  console.log('Supabase verification finished.');
}

verifySupabase();
