-- Modifica tabella collective_signups per supportare luce, gas o entrambi
-- Modifichiamo il constraint sulla colonna commodity

-- Prima rimuoviamo il vecchio constraint se esiste
ALTER TABLE public.collective_signups 
  DROP CONSTRAINT IF EXISTS collective_signups_commodity_check;

-- Ora aggiungiamo il nuovo constraint che supporta energy, gas, dual
ALTER TABLE public.collective_signups 
  ADD CONSTRAINT collective_signups_commodity_check 
  CHECK (commodity IN ('energy', 'gas', 'dual'));

-- Commento per chiarezza
COMMENT ON COLUMN public.collective_signups.commodity IS 
  'Tipo di commodity richiesta: energy (solo luce), gas (solo gas), dual (luce e gas)';