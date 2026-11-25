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
