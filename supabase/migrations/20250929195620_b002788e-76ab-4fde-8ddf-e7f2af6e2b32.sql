-- Add missing field to offers table
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS last_checked timestamptz DEFAULT now();

-- Create index for better query performance on active offers
CREATE INDEX IF NOT EXISTS idx_offers_active_commodity ON offers(is_active, commodity) WHERE is_active = true;

-- Insert sample real offers based on Italian market (September 2025)
-- Using 'indexed' instead of 'variable' to match check constraint
INSERT INTO offers (provider, plan_name, commodity, unit_price_eur_kwh, fixed_fee_eur_mo, pricing_type, valid_from, valid_to, redirect_url, terms_url, is_active, is_green, source, notes)
VALUES 
  ('Sorgenia', 'Next Energy Luce', 'power', 0.245, 10.00, 'fixed', '2025-09-01', '2026-08-31', 'https://www.sorgenia.it/offerta-luce-gas-next-energy', 'https://www.sorgenia.it/condizioni-contrattuali', true, true, 'manual', 'Prezzo fisso 12 mesi, 100% energia verde'),
  ('A2A', 'Click Luce', 'power', 0.228, 9.00, 'fixed', '2025-09-01', '2026-03-31', 'https://www.a2aenergia.eu/casa/luce/click', 'https://www.a2aenergia.eu/documenti', true, true, 'manual', 'Offerta online, energia 100% verde'),
  ('Edison', 'Luce Smart', 'power', 0.252, 11.00, 'indexed', '2025-09-01', '2026-08-31', 'https://www.edisonenergia.it/casa/luce/smart', 'https://www.edisonenergia.it/documenti', true, false, 'manual', 'Prezzo indicizzato legato a PUN'),
  ('Enel', 'Flexi Luce', 'power', 0.268, 12.50, 'indexed', '2025-09-01', '2025-12-31', 'https://www.enel.it/it/luce-e-gas/luce/flexi', 'https://www.enel.it/documenti-contrattuali', true, false, 'manual', 'Prezzo indicizzato, gestibile via app'),
  ('Iren', 'IrenLuce Fisso', 'power', 0.235, 8.50, 'fixed', '2025-09-01', '2026-08-31', 'https://www.irenlucegas.it/casa/luce/fisso', 'https://www.irenlucegas.it/contratti', true, true, 'manual', 'Prezzo bloccato 12 mesi, energia verde'),
  ('Acea', 'Simply Luce', 'power', 0.241, 9.90, 'fixed', '2025-09-01', '2026-02-28', 'https://aceaenergia.it/luce-gas/luce/simply', 'https://aceaenergia.it/documenti', true, false, 'manual', 'Offerta base, prezzo fisso 6 mesi'),
  ('Hera', 'HeraPiù Luce Verde', 'power', 0.239, 10.50, 'fixed', '2025-09-01', '2026-08-31', 'https://www.gruppohera.it/casa/luce/piu-verde', 'https://www.gruppohera.it/contratti', true, true, 'manual', 'Energia 100% rinnovabile, prezzo fisso'),
  ('Eni Plenitude', 'Trend Casa Luce', 'power', 0.256, 11.50, 'fixed', '2025-09-01', '2026-08-31', 'https://www.eniplenitude.com/casa/luce/trend', 'https://www.eniplenitude.com/documenti', true, true, 'manual', 'Sconto su energia verde, prezzo fisso 12 mesi'),
  ('Illumia', 'Luce Semplice Web', 'power', 0.231, 8.00, 'fixed', '2025-09-01', '2026-06-30', 'https://www.illumia.it/luce/semplice-web', 'https://www.illumia.it/condizioni', true, false, 'manual', 'Offerta 100% online, prezzo competitivo'),
  ('Octopus Energy', 'Flexible Octopus', 'power', 0.247, 9.50, 'indexed', '2025-09-01', '2026-08-31', 'https://octopusenergy.it/luce/flexible', 'https://octopusenergy.it/terms', true, true, 'manual', 'Prezzo indicizzato orario, energia verde'),
  ('Green Network', 'Click Luce Smart', 'power', 0.233, 7.90, 'fixed', '2025-09-01', '2026-05-31', 'https://www.greennetworkenergy.it/luce/smart', 'https://www.greennetworkenergy.it/condizioni', true, true, 'manual', 'Offerta web, energia verde certificata'),
  ('Wekiwi', 'Wekiwi Energia alla Fonte', 'power', 0.238, 8.80, 'fixed', '2025-09-01', '2026-08-31', 'https://www.wekiwi.it/luce/alla-fonte', 'https://www.wekiwi.it/documenti', true, false, 'manual', 'Modello a ricarica prepagata'),
  ('Plenitude', 'Extra Luce Green', 'power', 0.249, 10.20, 'fixed', '2025-09-01', '2026-07-31', 'https://www.plenitude.com/luce/extra-green', 'https://www.plenitude.com/condizioni', true, true, 'manual', 'Energia 100% verde con compensazione CO2')
ON CONFLICT DO NOTHING;