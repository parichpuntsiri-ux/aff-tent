-- All in One Investor — Supabase schema
-- Run in Supabase Dashboard → SQL Editor → New query → Run.
-- The app writes with the SERVICE ROLE key from the server only.
-- Row Level Security is enabled with NO public policies, so the anon key
-- (and therefore any browser) cannot read or write these tables.

create table if not exists public.alerts (
  id uuid primary key,
  symbol text not null,
  name text not null,
  action text not null check (action in ('BUY','SELL','CALL','PUT','HOLD')),
  confidence int not null check (confidence between 1 and 100),
  expected_return_pct numeric not null,
  horizon_label text not null,
  created_at timestamptz not null default now()
);
create index if not exists alerts_created_idx on public.alerts (created_at desc);
create index if not exists alerts_symbol_idx on public.alerts (symbol, action, created_at desc);

create table if not exists public.watchlist (
  id bigserial primary key,
  symbol text not null unique,
  added_at timestamptz not null default now()
);

alter table public.alerts enable row level security;
alter table public.watchlist enable row level security;
-- (intentionally no policies: only the service role bypasses RLS)
