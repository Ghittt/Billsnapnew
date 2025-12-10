#!/usr/bin/env ts-node
/**
 * Export Group Buying Subscribers to CSV
 * 
 * Usage: npx ts-node scripts/export-subscribers.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportSubscribers() {
  console.log('📧 Esportazione sottoscrittori gruppo di acquisto...\n');

  const { data: subscribers, error } = await supabase
    .from('group_buying_subscribers')
    .select('*')
    .eq('status', 'active')
    .order('subscribed_at', { ascending: false });

  if (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  }

  if (!subscribers || subscribers.length === 0) {
    console.log('⚠️  Nessun sottoscrittore trovato.');
    return;
  }

  // Create CSV
  const headers = [
    'Email',
    'Nome',
    'Telefono',
    'Città',
    'Provincia',
    'Consumo Annuo (kWh)',
    'Fornitore Attuale',
    'Interessato a',
    'Data Iscrizione',
    'UTM Source',
    'UTM Medium',
    'UTM Campaign',
    'Note'
  ];

  const csvRows = [headers.join(',')];

  for (const sub of subscribers) {
    const row = [
      sub.email || '',
      sub.name || '',
      sub.phone || '',
      sub.city || '',
      sub.province || '',
      sub.annual_consumption_kwh || '',
      sub.current_provider || '',
      sub.interested_in || '',
      new Date(sub.subscribed_at).toLocaleString('it-IT'),
      sub.utm_source || '',
      sub.utm_medium || '',
      sub.utm_campaign || '',
      (sub.notes || '').replace(/"/g, '""')
    ];
    csvRows.push(row.map(field => `"${field}"`).join(','));
  }

  const csv = csvRows.join('\n');
  const filename = `gruppo_acquisto_${new Date().toISOString().split('T')[0]}.csv`;
  const filepath = path.join(process.cwd(), filename);

  fs.writeFileSync(filepath, csv, 'utf-8');

  console.log(`✅ Esportati ${subscribers.length} sottoscrittori`);
  console.log(`📄 File salvato: ${filepath}\n`);
  
  // Print summary
  const byInterest = subscribers.reduce((acc: any, sub) => {
    const interest = sub.interested_in || 'non specificato';
    acc[interest] = (acc[interest] || 0) + 1;
    return acc;
  }, {});

  console.log('📊 Riepilogo per interesse:');
  Object.entries(byInterest).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });
}

exportSubscribers().catch(console.error);
