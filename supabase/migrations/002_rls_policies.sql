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
