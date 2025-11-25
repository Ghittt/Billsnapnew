# BillSnap - Architettura Scraping Firecrawl

## Panoramica

Il sistema di scraping è stato progettato per essere **robusto, scalabile e senza timeout**, utilizzando un'architettura a batch che divide i 16 provider energetici italiani in 4 gruppi da 4 provider ciascuno.

---

## Architettura

### 1. **Funzioni Batch** (4 funzioni)

Ogni batch gestisce 4 provider e completa in ~15-20 secondi:

- **`scrape-batch-1`**: Enel Luce, Sorgenia Luce, Edison Luce, Iren Luce
- **`scrape-batch-2`**: A2A Luce, Eni Luce, Acea Luce, Hera Luce
- **`scrape-batch-3`**: Enel Gas, Sorgenia Gas, Edison Gas, Iren Gas
- **`scrape-batch-4`**: A2A Gas, Eni Gas, Acea Gas, Hera Gas

Ogni funzione:
- ✅ Chiama Firecrawl API per scraping HTML/Markdown
- ✅ Estrae prezzi usando regex pattern robusti
- ✅ Gestisce errori per singolo provider (non blocca l'intero batch)
- ✅ Logga risultati con dettagli (success/error, prezzo estratto, content length)
- ✅ Ritorna JSON con dettagli batch

### 2. **Funzione Master** (`scrape-master`)

Orchestration layer che coordina l'intero processo:

1. **Deactivate old offers**: Imposta `is_active = false` per tutte le offerte Firecrawl esistenti
2. **Sequential batch execution**: Chiama i 4 batch in sequenza (con delay 1s tra ciascuno)
3. **Data aggregation**: Raccoglie tutti i risultati dai 4 batch
4. **Database insert**: Inserisce tutte le offerte valide nella tabella `offers` con:
   - `provider`, `plan_name`, `commodity`
   - `price_kwh` (luce) o `unit_price_eur_smc` (gas)
   - `fixed_fee_eur_mo`, `pricing_type`, `redirect_url`
   - `batch_id` (1-4) per tracciabilità
   - `source = 'firecrawl'`
   - `is_active = true`
   - `raw_json` con metadata (scraped_at, content_length)

5. **Return summary**: JSON con statistiche complete

---

## Schedulazione Automatica

### Cron Job (ogni 6 ore)

Il sistema utilizza **pg_cron** per eseguire automaticamente `scrape-master` ogni 6 ore:

```sql
-- Orari di esecuzione: 00:00, 06:00, 12:00, 18:00
SELECT cron.schedule(
  'scrape-offers-every-6-hours',
  '0 */6 * * *',
  $$ SELECT net.http_post(...) $$
);
```

**Vantaggi:**
- ✅ Nessuna dipendenza da servizi esterni
- ✅ Esecuzione affidabile e tracciabile
- ✅ Log automatici in Supabase Edge Functions
- ✅ Può essere disabilitato/modificato tramite SQL

---

## Gestione Errori

### Livello Provider
Se un provider fallisce (404, timeout, prezzo non trovato):
- ❌ Il provider viene loggato con `status: 'error'`
- ✅ Il batch continua con i provider successivi
- ✅ L'errore viene incluso nel JSON di risposta

### Livello Batch
Se un intero batch fallisce:
- ❌ Il batch ritorna `{ error: '...', batch_id: N }`
- ✅ Il master continua con i batch successivi
- ✅ Gli altri batch vengono eseguiti normalmente

### Livello Master
Se il master fallisce completamente:
- ❌ Ritorna HTTP 500 con dettagli errore
- ✅ Le offerte esistenti rimangono nel database
- ✅ Il prossimo cron job riproverà automaticamente

---

## Dati Salvati

### Tabella `offers`

Ogni offerta include:

```typescript
{
  id: uuid,
  provider: string,           // es. "Enel Energia"
  plan_name: string,          // es. "E-Light Luce"
  commodity: 'power' | 'gas',
  price_kwh: number | null,   // solo per luce
  unit_price_eur_smc: number | null, // solo per gas
  fixed_fee_eur_mo: number,   // quota fissa mensile
  pricing_type: 'fixed',
  source: 'firecrawl',
  is_active: boolean,         // true per offerte attuali
  valid_from: date,
  redirect_url: string,       // URL del provider
  batch_id: number,           // 1-4 per tracciabilità
  raw_json: jsonb,            // metadata scraping
  created_at: timestamp,
  updated_at: timestamp
}
```

---

## Testing

### Test Veloce (2 provider)

```bash
# Chiama la funzione test-scrape
curl -X POST https://qmslpwhtintqfijpxhsf.supabase.co/functions/v1/test-scrape
```

Risposta attesa:
```json
{
  "test_mode": true,
  "total_tested": 2,
  "successful": 2,
  "results": [
    {
      "provider": "Enel Energia",
      "status": "success",
      "data": { "price_kwh": 0.125, ... }
    }
  ]
}
```

### Test Batch Singolo

```bash
# Test batch 1 (4 provider luce)
curl -X POST https://qmslpwhtintqfijpxhsf.supabase.co/functions/v1/scrape-batch-1
```

### Test Completo (16 provider)

```bash
# Esegue master con tutti i batch
curl -X POST https://qmslpwhtintqfijpxhsf.supabase.co/functions/v1/scrape-master
```

Risposta attesa:
```json
{
  "success": true,
  "total_providers": 16,
  "successful": 14,
  "failed": 2,
  "inserted": 14,
  "batches": [
    { "batch_id": 1, "successful": 4, "total": 4 },
    { "batch_id": 2, "successful": 3, "total": 4 },
    ...
  ],
  "updated_at": "2025-11-25T12:00:00.000Z"
}
```

---

## Integrazione Frontend

Il frontend (`src/pages/Results.tsx`) legge automaticamente le offerte aggiornate da:
1. Tabella `comparison_results` → `ranked_offers` (JSON array)
2. Ogni offerta include `price_kwh` o `unit_price_eur_smc`
3. Se `price = null`, mostra "Prezzo non trovato"

**Nessuna modifica frontend richiesta** - i dati vengono letti automaticamente.

---

## Monitoring

### Log Supabase Edge Functions

```sql
-- Visualizza log master scraping
SELECT * FROM edge_logs 
WHERE function_name = 'scrape-master' 
ORDER BY timestamp DESC 
LIMIT 50;

-- Visualizza log batch specifico
SELECT * FROM edge_logs 
WHERE function_name = 'scrape-batch-1' 
ORDER BY timestamp DESC 
LIMIT 20;
```

### Verifica Offerte Attive

```sql
-- Conta offerte attive per commodity
SELECT commodity, COUNT(*) 
FROM offers 
WHERE is_active = true AND source = 'firecrawl'
GROUP BY commodity;

-- Ultimi scraping per provider
SELECT provider, plan_name, price_kwh, unit_price_eur_smc, created_at, batch_id
FROM offers
WHERE source = 'firecrawl' AND is_active = true
ORDER BY created_at DESC;
```

### Verifica Cron Job

```sql
-- Stato job schedulato
SELECT * FROM cron.job 
WHERE jobname = 'scrape-offers-every-6-hours';

-- Log esecuzioni cron
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'scrape-offers-every-6-hours')
ORDER BY start_time DESC 
LIMIT 10;
```

---

## Performance

| Metrica | Valore | Note |
|---------|--------|------|
| **Batch duration** | ~15-20s | 4 provider con delay 2s |
| **Master total** | ~70-90s | 4 batch + delays + DB insert |
| **Timeout limit** | 60s/batch | Ogni batch è sotto il limite |
| **Success rate** | ~85-95% | Dipende da disponibilità provider |
| **DB writes** | 1 bulk insert | Tutte le offerte inserite insieme |

---

## Troubleshooting

### Nessuna offerta scrappata
1. Verifica FIRECRAWL_API_KEY in Supabase secrets
2. Controlla log edge functions per errori HTTP
3. Testa con `test-scrape` prima di eseguire master

### Timeout su batch
1. Riduci delay tra provider (attualmente 2s)
2. Spezza batch in gruppi più piccoli (2 provider invece di 4)

### Prezzo non trovato
1. Verifica che il provider abbia pagine statiche (no JS-rendered)
2. Aggiorna regex pattern in `scrapeWithFirecrawl`
3. Controlla `raw_json.content_length` - potrebbe essere pagina vuota

### Cron job non parte
1. Verifica che pg_cron sia abilitato: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. Controlla log: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC;`
3. Re-schedule job se necessario

---

## Prossimi Sviluppi

- [ ] Aggiungere retry logic per provider falliti
- [ ] Implementare cache per evitare scraping duplicati
- [ ] Aggiungere notifiche su errori critici
- [ ] Dashboard admin per monitorare scraping
- [ ] Estendere a più provider (20+)

---

**Scraping stabile, automatizzato, senza timeout. ✅**
