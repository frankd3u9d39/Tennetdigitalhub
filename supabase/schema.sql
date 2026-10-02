-- Tennet schema for Supabase Postgres. Safe to re-run.
-- All access goes through the Next.js server (direct Postgres connection), never the public API:
-- RLS is enabled with no policies and anon/authenticated grants are revoked.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique not null references auth.users (id) on delete cascade,
  name text not null,
  email text unique not null,
  phone text unique,
  role text,
  reference text unique,
  member_since timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.app_users (id) on delete cascade,
  balance numeric(16, 2) not null default 0 check (balance >= 0)
);

-- direction: credit | debit ; status: pending | successful | failed
create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  label text not null,
  detail text,
  amount numeric(16, 2) not null,
  direction text not null check (direction in ('credit', 'debit')),
  status text not null check (status in ('pending', 'successful', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists ledger_entries_user_created on public.ledger_entries (user_id, created_at desc);

-- type: NIN | BVN ; status: successful | failed
create table if not exists public.verification_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  type text not null,
  queried text not null,
  subject_name text,
  status text not null,
  cost numeric(16, 2) not null,
  created_at timestamptz not null default now()
);
create index if not exists verification_records_user_created on public.verification_records (user_id, created_at desc);

alter table public.app_users enable row level security;
alter table public.wallets enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.verification_records enable row level security;

revoke all on public.app_users, public.wallets, public.ledger_entries, public.verification_records from anon, authenticated;

-- Phone verification was removed (sign-in is email/password or Google). Safe cleanup for databases created earlier.
drop table if exists public.phone_codes;
alter table public.app_users drop column if exists phone_verified_at;
