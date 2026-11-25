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
