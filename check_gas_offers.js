// Check gas offers in Supabase database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jxluygtonamgadqgzgyh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGasOffers() {
  console.log('🔍 Checking gas offers in database...\n');
  
  // Get all gas offers
  const { data: gasOffers, error } = await supabase
    .from('energy_offers')
    .select('*')
    .or('commodity.eq.gas,tipo_fornitura.eq.gas')
    .eq('is_active', true);
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`📊 Total GAS offers in database: ${gasOffers.length}\n`);
  
  if (gasOffers.length === 0) {
    console.log('❌ NO GAS OFFERS FOUND! This is why it says "best offer"');
    return;
  }
  
  // Calculate cost for 182 Smc consumption
  const consumption = 182; // Smc from user's bill
  const currentAnnualCost = 334.32; // €27.86/month * 12
  
  console.log(`💰 User's current cost: €${currentAnnualCost}/year for ${consumption} Smc\n`);
  
  // Evaluate each offer
  const evaluated = gasOffers.map(o => {
    const price = o.prezzo_energia_euro_smc || o.unit_price_eur_smc || 0;
    const quota = o.quota_fissa_mensile_euro || o.fixed_fee_eur_mo || 0;
    const annualCost = (consumption * price) + (quota * 12);
    const saving = currentAnnualCost - annualCost;
    
    return {
      provider: o.fornitore || o.provider,
      name: o.nome_offerta || o.plan_name,
      price_smc: price,
      quota_mensile: quota,
      annual_cost: annualCost,
      saving: saving,
      cheaper: saving > 0
    };
  }).sort((a, b) => b.saving - a.saving);
  
  console.log('🏆 TOP 5 BEST GAS OFFERS:\n');
  evaluated.slice(0, 5).forEach((o, i) => {
    const emoji = o.cheaper ? '✅' : '❌';
    console.log(`${i+1}. ${emoji} ${o.provider} - ${o.name}`);
    console.log(`   Price: €${o.price_smc}/Smc + €${o.quota_mensile}/month`);
    console.log(`   Annual: €${o.annual_cost.toFixed(2)} | Saving: €${o.saving.toFixed(2)}\n`);
  });
  
  const cheaperOffers = evaluated.filter(o => o.cheaper);
  console.log(`\n📈 Summary:`);
  console.log(`   Total gas offers: ${gasOffers.length}`);
  console.log(`   Cheaper than current: ${cheaperOffers.length}`);
  console.log(`   More expensive: ${gasOffers.length - cheaperOffers.length}`);
  
  if (cheaperOffers.length === 0) {
    console.log('\n✅ CONFIRMED: User has the best gas offer in our database!');
  } else {
    console.log(`\n⚠️  WARNING: Found ${cheaperOffers.length} cheaper offers!`);
  }
}

checkGasOffers();
