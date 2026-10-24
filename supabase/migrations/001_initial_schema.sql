-- ---------------------------------------------------------------------------
-- AvisTrack — schéma initial (T08)
--
-- Reprend les tables du cahier des charges (§ Annexe) et ajoute les colonnes
-- déjà exploitées par l'application (suppression logique, date de visite,
-- questions personnalisées du formulaire). Toutes les tables publiques ont
-- leur RLS activée dans `002_rls_policies.sql`.
-- ---------------------------------------------------------------------------

-- 1. Statut d'entreprise -----------------------------------------------------
create type public.company_status as enum ('active', 'suspended', 'pending');

-- 2. Entreprises -------------------------------------------------------------
create table public.companies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  public_id   text not null unique,
  name        text not null,
  slug        text not null unique,
  phone       text,
  email       text not null,
  status      public.company_status not null default 'active',
  -- Suppression logique : une entreprise supprimée reste en base pour l'audit.
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Un e-mail = une entreprise active (les comptes supprimés libèrent l'e-mail).
create unique index companies_email_active_key
  on public.companies (lower(email))
  where deleted_at is null;

create index companies_user_id_idx on public.companies (user_id);

-- 3. Avis clients ------------------------------------------------------------
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete cascade,
  rating         smallint not null check (rating between 1 and 5),
  comment        text,
  customer_name  text,
  customer_phone text,
  customer_email text,
  -- Date de visite déclarée par le client (AAAA-MM-JJ).
  visit_date     date,
  -- Réponses aux questions personnalisées du formulaire, indexées par question.
  answers        jsonb not null default '{}'::jsonb,
  status         text not null default 'published',
  created_at     timestamptz not null default now()
);

create index reviews_company_id_created_at_idx
  on public.reviews (company_id, created_at desc);

-- 4. Configuration du formulaire d'avis --------------------------------------
create table public.review_form_configs (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null unique references public.companies (id) on delete cascade,
  thanks_title   text not null default 'Merci pour votre avis !',
  thanks_message text not null default 'Votre retour aide notre équipe à améliorer nos services.',
  allow_comment  boolean not null default true,
  accent_color   text not null default '#d71920',
  -- Questions composées dans le Form studio (max 5, une seule note imposée).
  questions      jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

-- 5. Administrateurs de la plateforme ----------------------------------------
create table public.admins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  email      text not null,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

-- 6. Journal d'audit ---------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users (id),
  action      text not null,
  target_type text not null,
  target_id   text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

-- 7. `updated_at` automatique -------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger companies_touch_updated_at
  before update on public.companies
  for each row execute function public.touch_updated_at();

create trigger review_form_configs_touch_updated_at
  before update on public.review_form_configs
  for each row execute function public.touch_updated_at();
