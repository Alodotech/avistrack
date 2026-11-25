-- Remove company data 90 days after subscription expiry and queue owner-account
-- deletion only when the owner has no remaining company or admin account.

create table if not exists public.account_deletion_queue (
  user_id uuid primary key references auth.users (id) on delete cascade,
  queued_at timestamptz not null default now()
);

alter table public.account_deletion_queue enable row level security;
revoke all on public.account_deletion_queue from anon, authenticated;
grant all on public.account_deletion_queue to service_role;

create or replace function public.purge_deleted_companies(
  p_retention_days integer default 30
)
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
    returning c.id, c.user_id
  ),
  removed_audit as (
    delete from public.audit_logs a
    where a.target_type = 'company'
      and (
        a.target_id in (select d.id::text from deleted d)
        or not exists (
          select 1 from public.companies c where c.id::text = a.target_id
        )
      )
    returning a.id
  ),
  queued as (
    insert into public.account_deletion_queue (user_id)
    select distinct d.user_id
    from deleted d
    where not exists (
      select 1 from public.companies c where c.user_id = d.user_id
    )
      and not exists (
        select 1 from public.admins a where a.user_id = d.user_id
      )
    on conflict (user_id) do nothing
    returning user_id
  )
  select count(*)::integer into purged from deleted;

  return purged;
end;
$$;

create or replace function public.purge_expired_companies(
  p_inactive_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  purged integer;
begin
  if p_inactive_days is null or p_inactive_days < 0 then
    raise exception 'Durée de rétention invalide : %', p_inactive_days;
  end if;

  with expired as (
    delete from public.companies c
    where c.deleted_at is null
      and coalesce(
        s.current_period_end,
        s.trial_ends_at,
        case s.period
          when 'monthly' then s.started_at + interval '1 month'
          when 'annual' then s.started_at + interval '1 year'
          when 'trial' then s.started_at + interval '14 days'
          else c.created_at
        end,
        c.created_at
      ) < now() - make_interval(days => p_inactive_days)
    from public.company_subscriptions s
    where s.company_id = c.id
    returning c.id, c.user_id
  ),
  expired_without_subscription as (
    delete from public.companies c
    where c.deleted_at is null
      and not exists (
        select 1
        from public.company_subscriptions s
        where s.company_id = c.id
      )
      and c.created_at < now() - make_interval(days => p_inactive_days)
    returning c.id, c.user_id
  ),
  deleted as (
    select id, user_id from expired
    union all
    select id, user_id from expired_without_subscription
  ),
  removed_audit as (
    delete from public.audit_logs a
    where a.target_type = 'company'
      and (
        a.target_id in (select d.id::text from deleted d)
        or not exists (
          select 1 from public.companies c where c.id::text = a.target_id
        )
      )
    returning a.id
  ),
  queued as (
    insert into public.account_deletion_queue (user_id)
    select distinct d.user_id
    from deleted d
    where not exists (
      select 1 from public.companies c where c.user_id = d.user_id
    )
      and not exists (
        select 1 from public.admins a where a.user_id = d.user_id
      )
    on conflict (user_id) do nothing
    returning user_id
  )
  select count(*)::integer into purged from deleted;

  return purged;
end;
$$;

revoke all on function public.purge_deleted_companies(integer) from public;
revoke all on function public.purge_expired_companies(integer) from public;
grant execute on function public.purge_deleted_companies(integer) to service_role;
grant execute on function public.purge_expired_companies(integer) to service_role;
