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
