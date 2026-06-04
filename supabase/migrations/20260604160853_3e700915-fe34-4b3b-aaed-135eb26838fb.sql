CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chantier TEXT NOT NULL DEFAULT '',
  numero_tache TEXT NOT NULL DEFAULT '',
  client TEXT NOT NULL DEFAULT '',
  date_projet DATE NOT NULL DEFAULT CURRENT_DATE,
  longueur_barre INTEGER NOT NULL DEFAULT 6000,
  marge_securite INTEGER NOT NULL DEFAULT 100,
  trait_scie INTEGER NOT NULL DEFAULT 3,
  strategie TEXT NOT NULL DEFAULT 'min-barres',
  pieces JSONB NOT NULL DEFAULT '[]'::jsonb,
  stock JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own projects"
  ON public.projects FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX projects_user_id_created_at_idx ON public.projects (user_id, created_at DESC);