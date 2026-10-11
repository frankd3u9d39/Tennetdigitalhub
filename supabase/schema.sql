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

-- Bill payments (Interswitch): one ledger row per attempt, settled from 'pending' exactly once.
alter table public.ledger_entries add column if not exists reference text unique;
alter table public.ledger_entries add column if not exists provider_ref text;
alter table public.ledger_entries add column if not exists result jsonb;

-- Which provider handled (or holds) a bill payment, so a pending one can be re-checked with the right provider.
alter table public.ledger_entries add column if not exists provider text;

-- Wallet funding via Paystack. One row per checkout; a wallet is credited only by moving a 'pending' row to
-- 'success' (exactly once), after the amount has been confirmed with Paystack.
create table if not exists public.wallet_fundings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  reference text unique not null,
  amount numeric(16, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'mismatch')),
  paystack_id text,
  note text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists wallet_fundings_user_created on public.wallet_fundings (user_id, created_at desc);
alter table public.wallet_fundings enable row level security;
revoke all on public.wallet_fundings from anon, authenticated;

-- Real NIN/BVN lookups: record that the operator confirmed the subject's consent, and our own reference.
-- (Only a masked number and the name are stored; DOB, phone and photo are never saved.)
alter table public.verification_records add column if not exists consent boolean not null default false;
alter table public.verification_records add column if not exists reference text;

-- Distinguish a plain lookup from a purchased PDF slip in the history.
alter table public.verification_records add column if not exists kind text not null default 'lookup';

-- ================= Admin dashboard =================
-- Who may use /admin (also requires 2FA), and who is suspended.
alter table public.app_users add column if not exists is_admin boolean not null default false;
alter table public.app_users add column if not exists suspended_at timestamptz;

-- What a payment cost us (provider price), so the dashboard can estimate margin. Null for older rows.
alter table public.ledger_entries add column if not exists cost_amount numeric(16, 2);

-- Editable settings: 'pricing', 'services', 'providers'.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

-- Every admin action: who, what, on what, before and after.
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  target text,
  before jsonb,
  after jsonb,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created on public.admin_audit (created_at desc);

alter table public.app_settings enable row level security;
alter table public.admin_audit enable row level security;
revoke all on public.app_settings, public.admin_audit from anon, authenticated;
