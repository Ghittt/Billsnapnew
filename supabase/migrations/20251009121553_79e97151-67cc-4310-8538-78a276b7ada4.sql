-- Estendi la tabella profiles con informazioni dettagliate per profilazione AI
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS family_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS has_children boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS children_ages integer[] DEFAULT ARRAY[]::integer[],
ADD COLUMN IF NOT EXISTS work_from_home boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS home_type text,
ADD COLUMN IF NOT EXISTS heating_type text,
ADD COLUMN IF NOT EXISTS main_appliances text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS consumption_habits jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS profile_completed boolean DEFAULT false;

-- Commento esplicativo
COMMENT ON COLUMN public.profiles.family_size IS 'Numero totale di persone in casa';
COMMENT ON COLUMN public.profiles.has_children IS 'Presenza di figli nel nucleo familiare';
COMMENT ON COLUMN public.profiles.children_ages IS 'Età dei figli per analisi consumi (videogiochi, lavatrice, etc)';
COMMENT ON COLUMN public.profiles.work_from_home IS 'Lavoro da casa per stimare consumi diurni F1';
COMMENT ON COLUMN public.profiles.home_type IS 'Tipo abitazione: appartamento, casa, villa';
COMMENT ON COLUMN public.profiles.heating_type IS 'Tipo riscaldamento: gas, elettrico, pompa di calore';
COMMENT ON COLUMN public.profiles.main_appliances IS 'Elettrodomestici principali per stima consumi';
COMMENT ON COLUMN public.profiles.consumption_habits IS 'Abitudini di consumo dettagliate in formato JSON';
COMMENT ON COLUMN public.profiles.profile_completed IS 'Flag per indicare se il profilo è stato completato';