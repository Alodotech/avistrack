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
