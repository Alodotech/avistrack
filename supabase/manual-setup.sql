-- AvisTrack: initialisation manuelle d'une base Supabase vide.
-- Utilisation: copier tout ce fichier dans SQL Editor et l'executer une seule fois.
-- ATTENTION: ce script n'est pas idempotent et ne doit pas etre lance sur une base
-- deja initialisee ou contenant des donnees.
-- L'execution via SQL Editor n'enregistre pas les versions dans l'historique CLI
-- supabase_migrations.schema_migrations. Ne pas lancer ensuite `supabase db push`
-- sur cette base sans synchroniser cet historique.


-- >>> BEGIN 001_initial_schema.sql
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
-- <<< END 001_initial_schema.sql

-- >>> BEGIN 002_rls_policies.sql
-- ---------------------------------------------------------------------------
-- AvisTrack — politiques RLS (T09)
--
-- Objectif : étanchéité multi-tenant garantie par la base. Une entreprise ne
-- peut jamais lire les avis ni le profil d'une autre, même en forgeant ses
-- requêtes HTTP. La clé `service_role` (utilisée uniquement côté serveur pour
-- l'administration) contourne ces politiques.
-- ---------------------------------------------------------------------------

alter table public.companies           enable row level security;
alter table public.reviews             enable row level security;
alter table public.review_form_configs enable row level security;
alter table public.admins              enable row level security;
alter table public.audit_logs          enable row level security;

-- --- Privilèges de base ------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on public.companies           to authenticated;
grant select, insert, update, delete on public.reviews             to authenticated;
grant select, insert, update, delete on public.review_form_configs to authenticated;
grant select                          on public.admins              to authenticated;
grant select                          on public.audit_logs          to authenticated;

-- Le formulaire public (anonyme) ne voit que le strict nécessaire.
revoke all on public.companies           from anon;
revoke all on public.reviews             from anon;
revoke all on public.review_form_configs from anon;
revoke all on public.admins              from anon;
revoke all on public.audit_logs          from anon;

-- Formulaire public : l'entreprise scan annexe n'expose ni e-mail ni téléphone.
-- Le grant couvre aussi les colonnes évaluées par les politiques RLS
-- (`status`, `deleted_at`), sinon la policy « insert public » échoue.
grant select (id, public_id, name, status, deleted_at) on public.companies to anon;
grant insert                                            on public.reviews   to anon;
grant select                                            on public.review_form_configs to anon;

-- --- companies ---------------------------------------------------------------
create policy companies_select_own on public.companies
  for select to authenticated
  using (user_id = auth.uid());

create policy companies_update_own on public.companies
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Création de sa propre fiche entreprise (onboarding).
create policy companies_insert_own on public.companies
  for insert to authenticated
  with check (user_id = auth.uid());

-- Formulaire public : une entreprise non supprimée est joignable via `public_id`
-- (l'écran public distingue ensuite « introuvable » de « suspendue »).
create policy companies_select_public on public.companies
  for select to anon
  using (deleted_at is null);

-- --- reviews -----------------------------------------------------------------
create policy reviews_select_own on public.reviews
  for select to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

create policy reviews_insert_own on public.reviews
  for insert to authenticated
  with check (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

create policy reviews_delete_own on public.reviews
  for delete to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

-- Dépôt anonyme d'un avis : uniquement pour une entreprise active et non supprimée.
create policy reviews_insert_public on public.reviews
  for insert to anon
  with check (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and c.status = 'active'
        and c.deleted_at is null
    )
  );

-- --- review_form_configs -----------------------------------------------------
create policy form_configs_select_own on public.review_form_configs
  for select to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

create policy form_configs_write_own on public.review_form_configs
  for all to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  )
  with check (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

-- Le formulaire public affiche les textes et couleurs de l'entreprise scannée.
create policy form_configs_select_public on public.review_form_configs
  for select to anon
  using (
    exists (
      select 1 from public.companies c
      where c.id = company_id
        and c.status = 'active'
        and c.deleted_at is null
    )
  );

-- --- admins ------------------------------------------------------------------
-- Un administrateur ne peut lire que sa propre ligne (vérification de rôle).
create policy admins_select_self on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- --- audit_logs --------------------------------------------------------------
-- Lecture réservée aux administrateurs.
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));
-- <<< END 002_rls_policies.sql

-- >>> BEGIN 003_security_and_purge.sql
-- ---------------------------------------------------------------------------
-- AvisTrack — durcissement RLS, purge J+30 et agrégats plateforme (audit)
--
-- Cette migration ferme les failles relevées par l'audit de sécurité :
--
--  1. `anon` ne peut plus lire les tables `companies` et `review_form_configs`
--     (énumération des entreprises, y compris suspendues). La page d'avis
--     passe désormais par des fonctions `SECURITY DEFINER` paramétrées par
--     l'identifiant public, non devinable, de l'entreprise.
--  2. Le dépôt d'un avis est possible pour `anon` *et* `authenticated` : un
--     visiteur connecté ne doit pas être bloqué par le RLS.
--  3. Les droits d'écriture sont limités aux colonnes réellement saisies :
--     une entreprise ne peut plus s'attribuer le statut `active`, ni
--     ré-activer son propre compte suspendu, ni écrire la colonne `status`
--     d'un avis.
--  4. Le journal d'audit survit à la suppression du compte de l'acteur.
--  5. La purge définitive des entreprises supprimées depuis plus de 30 jours
--     existe enfin (fonction + planificateur `pg_cron`).
--  6. Les agrégats de la plateforme sont calculés en base (fonction
--     `platform_stats()`), sans charger l'intégralité des tables en mémoire.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Journal d'audit : l'acteur peut être supprimé
-- ---------------------------------------------------------------------------
alter table public.audit_logs
  drop constraint if exists audit_logs_actor_id_fkey;

alter table public.audit_logs
  add constraint audit_logs_actor_id_fkey
  foreign key (actor_id) references auth.users (id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Surface publique : plus aucune lecture directe des tables par `anon`
-- ---------------------------------------------------------------------------

-- La recherche de la page d'avis passe par `public_company_by_public_id()`.
revoke select on public.companies from anon;
revoke select (id, public_id, name, status, deleted_at) on public.companies from anon;

-- La personnalisation du formulaire passe par `public_form_config()`.
revoke select on public.review_form_configs from anon;

-- Les droits d'écriture sont recentrés sur les colonnes saisies.
revoke insert on public.reviews from anon;
grant insert (id, company_id, rating, comment, visit_date, answers)
  on public.reviews to anon;

revoke insert, update on public.reviews from authenticated;
grant insert (id, company_id, rating, comment, visit_date, answers)
  on public.reviews to authenticated;

-- Une entreprise ne modifie que son profil : ni son statut, ni sa date de
-- suppression, ni son propriétaire.
revoke insert, update on public.companies from authenticated;
grant insert (user_id, public_id, slug, name, email, phone)
  on public.companies to authenticated;
grant update (name, phone) on public.companies to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Fonctions `SECURITY DEFINER` : la surface publique minimale
--
-- `SECURITY DEFINER` est indispensable : les expressions de politique RLS
-- sont évaluées avec les droits du rôle appelant, donc un `anon` privé de
-- `SELECT` sur `companies` ne peut pas tester l'existence de l'entreprise
-- cible. Ces fonctions encapsulent ce test.
-- ---------------------------------------------------------------------------

-- Entreprise joignable par son identifiant public (non devinable).
-- La suppression logique est exclue : une entreprise supprimée n'est plus
-- joignable, quelle que soit la politique de l'application.
create or replace function public.public_company_by_public_id(p_public_id text)
returns table (
  id uuid,
  public_id text,
  name text,
  status public.company_status
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.public_id, c.name, c.status
  from public.companies c
  where c.public_id = p_public_id
    and c.deleted_at is null;
$$;

-- Configuration du formulaire d'avis d'une entreprise active.
create or replace function public.public_form_config(p_public_id text)
returns table (
  thanks_title text,
  thanks_message text,
  allow_comment boolean,
  accent_color text,
  questions jsonb
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select f.thanks_title, f.thanks_message, f.allow_comment, f.accent_color, f.questions
  from public.review_form_configs f
  join public.companies c on c.id = f.company_id
  where c.public_id = p_public_id
    and c.status = 'active'
    and c.deleted_at is null;
$$;

-- Une entreprise accepte-t-elle des avis ? (politique d'insertion)
create or replace function public.company_accepts_reviews(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.companies c
    where c.id = p_company_id
      and c.status = 'active'
      and c.deleted_at is null
  );
$$;

revoke all on function public.public_company_by_public_id(text) from public;
revoke all on function public.public_form_config(text) from public;
revoke all on function public.company_accepts_reviews(uuid) from public;

grant execute on function public.public_company_by_public_id(text) to anon, authenticated;
grant execute on function public.public_form_config(text) to anon, authenticated;
grant execute on function public.company_accepts_reviews(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Politiques : la page d'avis ne dépend plus d'un accès direct aux tables
-- ---------------------------------------------------------------------------
drop policy if exists companies_select_public on public.companies;
drop policy if exists form_configs_select_public on public.review_form_configs;

drop policy if exists reviews_insert_public on public.reviews;

-- Un avis peut être déposé par un visiteur anonyme comme par un visiteur
-- connecté : le formulaire est public dans les deux cas.
create policy reviews_insert_public on public.reviews
  for insert to anon, authenticated
  with check (public.company_accepts_reviews(company_id));

-- ---------------------------------------------------------------------------
-- 5. Purge définitive des entreprises supprimées depuis plus de 30 jours
-- ---------------------------------------------------------------------------
create index if not exists companies_deleted_at_idx
  on public.companies (deleted_at)
  where deleted_at is not null;

-- Suppression définitive : les avis et le formulaire de l'entreprise partent
-- avec elle (cascade), le journal d'audit est conservé (aucune clé étrangère).
create or replace function public.purge_deleted_companies(p_retention_days integer default 30)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  purged integer;
begin
  if p_retention_days is null or p_retention_days < 0 then
    raise exception 'Durée de rétention invalide : %', p_retention_days;
  end if;

  with deleted as (
    delete from public.companies c
    where c.deleted_at is not null
      and c.deleted_at < now() - make_interval(days => p_retention_days)
    returning c.id
  )
  select count(*)::integer into purged from deleted;

  return purged;
end;
$$;

revoke all on function public.purge_deleted_companies(integer) from public;
grant execute on function public.purge_deleted_companies(integer) to service_role;

-- Planification quotidienne. `pg_cron` n'est pas disponible sur toutes les
-- installations : en son absence, la purge reste jouable via `npm run db:purge`.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if not exists (select 1 from cron.job where jobname = 'avistrack-purge-companies') then
      perform cron.schedule(
        'avistrack-purge-companies',
        '17 3 * * *',
        'select public.purge_deleted_companies(30);'
      );
    end if;
  else
    raise notice 'pg_cron indisponible : purge à planifier autrement (npm run db:purge).';
  end if;
exception
  when others then
    raise notice 'Planification pg_cron impossible (%) : purge via npm run db:purge.', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Agrégats de la plateforme calculés en base
--
-- Le tableau de bord Admin ne charge plus l'intégralité des entreprises et des
-- avis en mémoire : la fonction fait le regroupement côté PostgreSQL.
-- ---------------------------------------------------------------------------
create or replace function public.platform_stats()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with bounds as (
  select
    now() as at,
    now() - interval '7 days' as week_from,
    now() - interval '30 days' as current_from,
    now() - interval '60 days' as previous_from
),
live_companies as (
  select c.id, c.status, c.created_at
  from public.companies c
  where c.deleted_at is null
),
live_reviews as (
  select r.rating, r.created_at
  from public.reviews r
  join live_companies lc on lc.id = r.company_id
),
months as (
  select
    to_char(date_trunc('month', b.at) - (interval '1 month' * n), 'YYYY-MM') as month,
    n
  from bounds b, generate_series(11, 0, -1) as n
),
company_months as (
  select m.month, count(lc.id)::integer as count
  from months m
  left join live_companies lc on to_char(lc.created_at, 'YYYY-MM') = m.month
  group by m.month, m.n
),
review_months as (
  select m.month, count(lr.created_at)::integer as count
  from months m
  left join live_reviews lr on to_char(lr.created_at, 'YYYY-MM') = m.month
  group by m.month, m.n
)
select jsonb_build_object(
  'company_count', (select count(*)::integer from live_companies),
  'suspended_company_count', (select count(*)::integer from live_companies where status = 'suspended'),
  'review_count', (select count(*)::integer from live_reviews),
  'average_rating', (select round(avg(rating)::numeric, 1) from live_reviews),
  'new_companies_last_7_days', (
    select count(*)::integer from live_companies, bounds where created_at >= bounds.week_from
  ),
  'new_companies_last_30_days', (
    select count(*)::integer from live_companies, bounds where created_at >= bounds.current_from
  ),
  'new_companies_previous_30_days', (
    select count(*)::integer from live_companies, bounds
    where created_at >= bounds.previous_from and created_at < bounds.current_from
  ),
  'reviews_last_30_days', (
    select count(*)::integer from live_reviews, bounds where created_at >= bounds.current_from
  ),
  'reviews_previous_30_days', (
    select count(*)::integer from live_reviews, bounds
    where created_at >= bounds.previous_from and created_at < bounds.current_from
  ),
  'companies_last_12_months', (
    select coalesce(
      jsonb_agg(jsonb_build_object('month', month, 'count', count) order by month),
      '[]'::jsonb
    ) from company_months
  ),
  'reviews_last_12_months', (
    select coalesce(
      jsonb_agg(jsonb_build_object('month', month, 'count', count) order by month),
      '[]'::jsonb
    ) from review_months
  )
);
$$;

revoke all on function public.platform_stats() from public;
grant execute on function public.platform_stats() to service_role;
-- <<< END 003_security_and_purge.sql

-- >>> BEGIN 004_company_logo.sql
alter table public.companies
  add column if not exists logo_url text;

revoke update on public.companies from authenticated;
grant update (name, phone, logo_url) on public.companies to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- <<< END 004_company_logo.sql

-- >>> BEGIN 005_admin_permissions_and_remarks.sql
-- ---------------------------------------------------------------------------
-- AvisTrack — permissions d'administration, identité des avis et remarques
-- ---------------------------------------------------------------------------

-- 1. Permissions par module ---------------------------------------------------
alter table public.admins
  add column if not exists permissions jsonb not null default jsonb_build_object(
    'dashboard', 'manage',
    'companies', 'manage',
    'finances', 'manage',
    'users', 'manage',
    'audit', 'manage',
    'reports', 'manage'
  );

update public.admins
set permissions = jsonb_build_object(
  'dashboard', 'read',
  'companies', 'read',
  'finances', 'read',
  'users', 'none',
  'audit', 'read',
  'reports', 'read'
)
where role = 'dirigeant';

-- 2. Identité facultative de l'auteur d'un avis -------------------------------
alter table public.reviews
  add column if not exists customer_first_name text;

revoke insert on public.reviews from anon, authenticated;
grant insert (
  id,
  company_id,
  rating,
  comment,
  customer_name,
  customer_first_name,
  customer_phone,
  customer_email,
  visit_date,
  answers
) on public.reviews to anon, authenticated;

-- 3. Remarques séparées des avis ----------------------------------------------
create table if not exists public.company_remarks (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  first_name  text,
  last_name   text,
  phone       text,
  message     text not null check (char_length(message) between 1 and 4000),
  status      text not null default 'published',
  created_at  timestamptz not null default now()
);

create index if not exists company_remarks_company_created_at_idx
  on public.company_remarks (company_id, created_at desc);

alter table public.company_remarks enable row level security;

revoke all on public.company_remarks from anon, authenticated;
grant select, delete on public.company_remarks to authenticated;
grant insert (id, company_id, first_name, last_name, phone, message)
  on public.company_remarks to anon, authenticated;

create policy company_remarks_select_own on public.company_remarks
  for select to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

create policy company_remarks_delete_own on public.company_remarks
  for delete to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

create policy company_remarks_insert_public on public.company_remarks
  for insert to anon, authenticated
  with check (public.company_accepts_reviews(company_id));
-- <<< END 005_admin_permissions_and_remarks.sql

-- >>> BEGIN 006_subscriptions_payments_qr_remarks.sql
-- ---------------------------------------------------------------------------
-- AvisTrack — abonnements, paiements simulés, QR généré, identité des avis
-- ---------------------------------------------------------------------------

-- 1. Abonnement de l'entreprise ------------------------------------------------
create table if not exists public.company_subscriptions (
  company_id         uuid primary key references public.companies (id) on delete cascade,
  plan               text not null default 'trial'
                     check (plan in ('trial', 'pro', 'enterprise')),
  period             text not null default 'trial'
                     check (period in ('trial', 'monthly', 'annual')),
  amount             integer not null default 0 check (amount >= 0),
  status             text not null default 'trialing'
                     check (status in ('trialing', 'active', 'canceled', 'expired', 'suspended')),
  started_at         timestamptz not null default now(),
  current_period_end timestamptz,
  trial_ends_at      timestamptz,
  canceled_at        timestamptz,
  updated_at         timestamptz not null default now()
);

create trigger company_subscriptions_touch_updated_at
  before update on public.company_subscriptions
  for each row execute function public.touch_updated_at();

alter table public.company_subscriptions enable row level security;

revoke all on public.company_subscriptions from anon, authenticated;
grant select on public.company_subscriptions to authenticated;

create policy company_subscriptions_select_own on public.company_subscriptions
  for select to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

-- 2. Paiements (historique et reçus) -----------------------------------------
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  plan        text not null,
  period      text not null,
  amount      integer not null check (amount >= 0),
  status      text not null default 'pending'
              check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider    text not null default 'demo',
  provider_ref text,
  created_at  timestamptz not null default now()
);

create index if not exists payments_company_created_at_idx
  on public.payments (company_id, created_at desc);

alter table public.payments enable row level security;

revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

create policy payments_select_own on public.payments
  for select to authenticated
  using (
    company_id in (select id from public.companies where user_id = auth.uid())
  );

-- 3. Téléchargements de rapports (espace admin) ------------------------------
create table if not exists public.report_downloads (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references auth.users (id) on delete set null,
  admin_email text not null,
  period      text not null,
  label       text not null,
  format      text not null check (format in ('pdf', 'excel', 'csv')),
  created_at  timestamptz not null default now()
);

create index if not exists report_downloads_created_at_idx
  on public.report_downloads (created_at desc);

alter table public.report_downloads enable row level security;
revoke all on public.report_downloads from anon, authenticated;

-- 4. QR code généré automatiquement ------------------------------------------
alter table public.companies
  add column if not exists qr_generated_at timestamptz;

-- 5. Identité de l'auteur d'un avis ------------------------------------------
alter table public.reviews
  add column if not exists reviewer_type text not null default 'anonymous'
  check (reviewer_type in ('anonymous', 'identified'));

-- Le prénom et le nom sont collectés séparément ; `customer_name` conserve le
-- nom de famille pour rester compatible avec les données existantes.
alter table public.reviews
  add column if not exists customer_first_name text;

revoke insert on public.reviews from anon, authenticated;
grant insert (
  id,
  company_id,
  rating,
  comment,
  customer_name,
  customer_first_name,
  customer_phone,
  customer_email,
  visit_date,
  answers,
  reviewer_type
) on public.reviews to anon, authenticated;

-- 6. Options du formulaire public --------------------------------------------
alter table public.review_form_configs
  add column if not exists allow_anonymous boolean not null default true;
alter table public.review_form_configs
  add column if not exists allow_remarks boolean not null default true;

-- 7. Fonction publique de configuration (colonnes supplémentaires) -----------
drop function if exists public.public_form_config(text);

create or replace function public.public_form_config(p_public_id text)
returns table (
  thanks_title text,
  thanks_message text,
  allow_comment boolean,
  accent_color text,
  questions jsonb,
  allow_anonymous boolean,
  allow_remarks boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    f.thanks_title,
    f.thanks_message,
    f.allow_comment,
    f.accent_color,
    f.questions,
    f.allow_anonymous,
    f.allow_remarks
  from public.review_form_configs f
  join public.companies c on c.id = f.company_id
  where c.public_id = p_public_id
    and c.status = 'active'
    and c.deleted_at is null;
$$;

revoke all on function public.public_form_config(text) from public;
grant execute on function public.public_form_config(text) to anon, authenticated;

-- 8. Reprise des abonnements historiques consignés dans le journal d'audit ---
insert into public.company_subscriptions (
  company_id,
  plan,
  period,
  amount,
  status,
  started_at,
  current_period_end,
  trial_ends_at
)
select distinct on (a.target_id)
  a.target_id::uuid,
  case when a.details->>'period' in ('monthly', 'annual') then 'pro' else 'trial' end,
  case when a.details->>'period' in ('monthly', 'annual') then a.details->>'period' else 'trial' end,
  coalesce((a.details->>'amount')::integer, 0),
  case
    when a.details->>'period' in ('monthly', 'annual') then 'active'
    else 'trialing'
  end,
  a.created_at,
  case
    when a.details->>'period' = 'annual' then a.created_at + interval '1 year'
    when a.details->>'period' = 'monthly' then a.created_at + interval '1 month'
    else null
  end,
  case
    when a.details->>'period' not in ('monthly', 'annual')
      then a.created_at + interval '14 days'
    else null
  end
from public.audit_logs a
join public.companies c on c.id = a.target_id::uuid
where a.action = 'UPDATE_SUBSCRIPTION'
  and a.target_type = 'company'
order by a.target_id, a.created_at desc
on conflict (company_id) do nothing;

-- 9. Essai par défaut pour les entreprises existantes ------------------------
insert into public.company_subscriptions (company_id, plan, period, amount, status, trial_ends_at)
select c.id, 'trial', 'trial', 0, 'trialing', c.created_at + interval '14 days'
from public.companies c
where c.deleted_at is null
on conflict (company_id) do nothing;
-- <<< END 006_subscriptions_payments_qr_remarks.sql

-- >>> BEGIN 007_admin_roles.sql
-- ---------------------------------------------------------------------------
-- AvisTrack — rôles d'administration personnalisés (migration 007)
-- ---------------------------------------------------------------------------

-- 1. Rôles --------------------------------------------------------------------
create table if not exists public.admin_roles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique
              check (char_length(trim(name)) between 2 and 60),
  permissions jsonb not null default jsonb_build_object(
    'dashboard', 'none',
    'companies', 'none',
    'finances', 'none',
    'users', 'none',
    'audit', 'none',
    'reports', 'none'
  ),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger admin_roles_touch_updated_at
  before update on public.admin_roles
  for each row execute function public.touch_updated_at();

alter table public.admin_roles enable row level security;

-- Les rôles sont lus et écrits exclusivement par le serveur (clé service_role).
revoke all on public.admin_roles from anon, authenticated;

-- 2. Assignation d'un rôle à un membre ---------------------------------------
alter table public.admins
  add column if not exists role_id uuid
  references public.admin_roles (id) on delete set null;

create index if not exists admins_role_id_idx on public.admins (role_id);
-- <<< END 007_admin_roles.sql

-- >>> BEGIN 20261123214236_fedapay_payment_idempotency.sql
create table if not exists public.fedapay_webhook_events (
  id text primary key,
  name text,
  received_at timestamptz not null default now()
);

alter table public.fedapay_webhook_events enable row level security;

revoke all on public.fedapay_webhook_events from anon, authenticated;

create unique index if not exists payments_provider_ref_unique
  on public.payments (provider, provider_ref)
  where provider_ref is not null;
-- <<< END 20261123214236_fedapay_payment_idempotency.sql

-- >>> BEGIN 20261124120000_feexpay_webhook_idempotency.sql
create table if not exists public.feexpay_webhook_events (
  id text primary key,
  name text,
  received_at timestamptz not null default now()
);

alter table public.feexpay_webhook_events enable row level security;

revoke all on public.feexpay_webhook_events from anon, authenticated;
-- <<< END 20261124120000_feexpay_webhook_idempotency.sql

-- >>> BEGIN 20261124122500_company_country_code.sql
alter table public.companies
  add column if not exists country_code text not null default 'BJ'
  check (country_code in ('BJ', 'BF', 'CI', 'SN', 'TG', 'CG'));
-- <<< END 20261124122500_company_country_code.sql
