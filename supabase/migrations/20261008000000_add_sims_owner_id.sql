-- Add nullable ownership metadata without changing or deleting existing simulations.
-- Existing rows remain public and unowned (owner_id IS NULL).
ALTER TABLE public.sims
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS sims_owner_id_idx ON public.sims (owner_id);
