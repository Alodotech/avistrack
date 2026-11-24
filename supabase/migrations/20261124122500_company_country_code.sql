alter table public.companies
  add column if not exists country_code text not null default 'BJ'
  check (country_code in ('BJ', 'BF', 'CI', 'SN', 'TG', 'CG'));
