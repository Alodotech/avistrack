create table if not exists public.feexpay_webhook_events (
  id text primary key,
  name text,
  received_at timestamptz not null default now()
);

alter table public.feexpay_webhook_events enable row level security;

revoke all on public.feexpay_webhook_events from anon, authenticated;
