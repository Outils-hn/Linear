-- Calculs partages (Linear, Format, Trame) : a coller UNE FOIS dans Supabase > SQL Editor > Run.
-- Ne stocke que les donnees saisies (pas les resultats, recalcules a l'ouverture).
-- Lecture : tout compte valide. Ecriture / suppression : l'auteur. Corbeille 30 jours.
create table if not exists public.calculs (
  id uuid primary key default gen_random_uuid(),
  app text not null check (app in ('linear', 'format', 'trame')),
  chantier_numero text not null default '' check (length(chantier_numero) <= 60),
  chantier_nom text not null default '' check (length(chantier_nom) <= 200),
  nom text not null default '' check (length(nom) <= 200),
  donnees jsonb not null check (pg_column_size(donnees) < 2000000),
  auteur uuid not null default auth.uid() references auth.users(id) on delete cascade,
  auteur_email text not null default coalesce(auth.jwt() ->> 'email', ''),
  supprime_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists calculs_chantier on public.calculs (chantier_numero);
create index if not exists calculs_app on public.calculs (app);

alter table public.calculs enable row level security;
drop policy if exists "calculs lecture" on public.calculs;
create policy "calculs lecture" on public.calculs for select to authenticated using (public.is_approved());
drop policy if exists "calculs ajout" on public.calculs;
create policy "calculs ajout" on public.calculs for insert to authenticated with check (public.is_approved() and auteur = auth.uid());
drop policy if exists "calculs modification" on public.calculs;
create policy "calculs modification" on public.calculs for update to authenticated using (public.is_approved() and auteur = auth.uid()) with check (auteur = auth.uid());
drop policy if exists "calculs suppression" on public.calculs;
create policy "calculs suppression" on public.calculs for delete to authenticated using (auteur = auth.uid());
grant select, insert, update, delete on public.calculs to authenticated;

-- Date de modification automatique
create or replace function public.calculs_maj() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists calculs_maj on public.calculs;
create trigger calculs_maj before update on public.calculs for each row execute function public.calculs_maj();

-- Corbeille : un calcul supprime depuis plus de 30 jours disparait pour de bon (nettoyage a chaque ajout)
create or replace function public.calculs_purge() returns trigger language plpgsql security definer set search_path = public as $$
begin delete from public.calculs where supprime_le < now() - interval '30 days'; return null; end $$;
drop trigger if exists calculs_purge on public.calculs;
create trigger calculs_purge after insert on public.calculs for each statement execute function public.calculs_purge();
