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
