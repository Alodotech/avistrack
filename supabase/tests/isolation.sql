-- ---------------------------------------------------------------------------
-- AvisTrack — test d'isolation multi-tenant (T09)
--
-- Exécuté par `supabase test db`. Le test joue le rôle de deux entreprises
-- authentifiées distinctes et vérifie qu'aucune ne voit les données de
-- l'autre : la garantie ne repose pas sur l'application, mais sur la base.
--
-- Les données sont créées puis supprimées : le test est transactionnel et
-- laisse la base dans son état initial.
-- ---------------------------------------------------------------------------

begin;

select plan(9);

-- --- Données de test ---------------------------------------------------------

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'isolation-a@avistrack.test'),
  ('22222222-2222-4222-8222-222222222222', 'isolation-b@avistrack.test');

insert into public.companies (id, user_id, public_id, name, slug, email, status)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
   'isolation-a', 'Entreprise A', 'entreprise-a', 'a@avistrack.test', 'active'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222',
   'isolation-b', 'Entreprise B', 'entreprise-b', 'b@avistrack.test', 'active');

insert into public.reviews (company_id, rating, comment)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 5, 'Avis de A'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 1, 'Avis de B');

-- --- 1. Une entreprise ne voit que ses propres avis -------------------------

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true
);

select is(
  (select count(*) from public.reviews),
  1::bigint,
  'L’entreprise A ne voit que son propre avis'
);

select is(
  (select comment from public.reviews),
  'Avis de A',
  'L’entreprise A ne lit pas l’avis de B'
);

select is(
  (select count(*) from public.companies),
  1::bigint,
  'L’entreprise A ne voit que sa propre fiche'
);

select is(
  (select name from public.companies),
  'Entreprise A',
  'L’entreprise A ne lit pas la fiche de B'
);

-- --- 2. Écriture : impossible d’écrire dans le périmètre de l’autre ----------

select throws_ok(
  $$insert into public.reviews (company_id, rating) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 3)$$,
  '42501',
  null,
  'L’entreprise A ne peut pas insérer d’avis chez B'
);

-- --- 3. Le formulaire public reste anonyme ------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);

select is(
  (select count(*) from public.reviews),
  0::bigint,
  'Un visiteur anonyme ne lit aucun avis'
);

select is(
  (select count(*) from public.companies),
  2::bigint,
  'Un visiteur anonyme voit les entreprises actives (formulaire public)'
);

select lives_ok(
  $$insert into public.reviews (company_id, rating) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 4)$$,
  'Un visiteur anonyme peut déposer un avis pour une entreprise active'
);

-- --- 4. Nettoyage --------------------------------------------------------------

reset role;

select * from finish();
rollback;
