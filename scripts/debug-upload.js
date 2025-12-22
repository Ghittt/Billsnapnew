import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars from root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_anon_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const uploadId = '0c6ab831-c280-4738-9c97-0d08b05a0279';
  console.log('Inspecting upload: ' + uploadId);

  const { data: ocr, error } = await supabase
    .from('ocr_results')
    .select('*')
    .eq('upload_id', uploadId)
    .single();

  if (error) {
    console.error('Error fetching OCR:', error);
    return;
  }

  console.log('--- OCR DATA ---');
  console.log('ID:', ocr.id);
  console.log('Provider:', ocr.provider);
  console.log('Tipo Fornitura (hint):', ocr.tipo_fornitura);
  console.log('Consumption (annual): kWh=', ocr.annual_kwh, ' Smc=', ocr.consumo_annuo_smc, ' Gas_Smc=', ocr.gas_smc);
  console.log('Cost:', ocr.totale_periodo_euro);
  console.log('\n--- RAW JSON SNIPPET ---');
  
  if (ocr.raw_json) {
      console.log('Luce:', ocr.raw_json.bolletta_luce ? 'Present' : 'Missing');
      if (ocr.raw_json.bolletta_luce) {
          console.log('  Consumo kWh:', ocr.raw_json.bolletta_luce.consumo_annuo_kwh);
          console.log('  Periodo:', JSON.stringify(ocr.raw_json.bolletta_luce.periodo));
      }
      console.log('Gas:', ocr.raw_json.bolletta_gas ? 'Present' : 'Missing');
      if (ocr.raw_json.bolletta_gas) {
          console.log('  Consumo Smc:', ocr.raw_json.bolletta_gas.consumo_annuo_smc);
          console.log('  Periodo:', JSON.stringify(ocr.raw_json.bolletta_gas.periodo));
      }
  } else {
      console.log('No raw_json found.');
  }

  // Also check if there are any offers that would match this
  if ((ocr.annual_kwh && ocr.annual_kwh > 0) || ocr.tipo_fornitura === 'luce') {
     const { count } = await supabase.from('energy_offers').select('*', { count: 'exact', head: true }).or('commodity.eq.LUCE,commodity.eq.electricity');
     console.log('Available LUCE offers count:', count);
  }
  if ((ocr.consumo_annuo_smc && ocr.consumo_annuo_smc > 0) || (ocr.gas_smc && ocr.gas_smc > 0) || ocr.tipo_fornitura === 'gas') {
      const { count } = await supabase.from('energy_offers').select('*', { count: 'exact', head: true }).eq('commodity', 'GAS');
      console.log('Available GAS offers count:', count);
  }
}

main();
