-- =====================================================================
-- Siddhi Farm Resort — Supabase schema
-- Run this file ONCE inside Supabase → SQL Editor → New Query → Run.
-- Safe to re-run (all statements are idempotent).
-- =====================================================================

-- ---------- PROFILES ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  phone text,
  role text not null default 'customer' check (role in ('customer','staff','manager','super_admin')),
  created_at timestamptz not null default now()
);

-- ---------- PRICING (single-row config) ----------
create table if not exists public.pricing (
  id text primary key default 'current',
  values jsonb not null default '{
    "masterBedroom": 4500,
    "villa2BHK": 9000,
    "villa4BHK": 15000,
    "oneDayTour": 700,
    "miniWaterPark": 950,
    "weddingEvent": 35000,
    "engagementEvent": 18000,
    "birthdayEvent": 12000,
    "getTogetherEvent": 10000
  }'::jsonb,
  updated_at timestamptz not null default now()
);
insert into public.pricing (id) values ('current') on conflict (id) do nothing;

-- ---------- BOOKINGS ----------
create table if not exists public.bookings (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text,
  phone text not null,
  service text not null,
  check_in date not null,
  check_out date not null,
  check_in_time time,
  check_out_time time,
  guests int not null default 2,
  nights int not null default 1,
  subtotal int not null default 0,
  discount int not null default 0,
  amount int not null default 0,
  applied_coupon text,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','completed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  paid boolean not null default false,
  terms_accepted_at timestamptz,
  terms_version text,
  terms_content jsonb,
  notes text,
  created_at timestamptz not null default now()
);
-- Safe for existing projects created before booking-time customisation.
alter table public.bookings add column if not exists check_in_time time;
alter table public.bookings add column if not exists check_out_time time;
alter table public.bookings add column if not exists terms_accepted_at timestamptz;
alter table public.bookings add column if not exists terms_version text;
alter table public.bookings add column if not exists terms_content jsonb;
create index if not exists idx_bookings_service_dates on public.bookings(service, check_in, check_out);
create index if not exists idx_bookings_status on public.bookings(status);
create index if not exists idx_bookings_user on public.bookings(user_id);

-- ---------- COUPONS ----------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null default 'percentage' check (type in ('percentage','fixed')),
  value numeric not null,
  active boolean not null default true,
  usage_limit int not null default 0,
  used int not null default 0,
  min_amount int not null default 0,
  max_discount int,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- REVIEWS ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- GALLERY ----------
create table if not exists public.gallery (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'general',
  url text not null,
  caption text,
  created_at timestamptz not null default now()
);

-- ---------- SETTINGS (key/value config) ----------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- AUTO CREATE PROFILE ON SIGNUP ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'phone',
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- This is a trigger-only helper; it must not be callable through the public RPC API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.profiles  enable row level security;
alter table public.pricing   enable row level security;
alter table public.bookings  enable row level security;
alter table public.coupons   enable row level security;
alter table public.reviews   enable row level security;
alter table public.gallery   enable row level security;
alter table public.settings  enable row level security;

-- Public read where safe
drop policy if exists "pricing_read_all" on public.pricing;
create policy "pricing_read_all" on public.pricing for select using (true);

drop policy if exists "gallery_read_all" on public.gallery;
create policy "gallery_read_all" on public.gallery for select using (true);

drop policy if exists "reviews_read_approved" on public.reviews;
create policy "reviews_read_approved" on public.reviews for select using (approved = true);

-- Profiles: own row
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Bookings: own
drop policy if exists "bookings_read_own" on public.bookings;
create policy "bookings_read_own" on public.bookings for select using (auth.uid() = user_id);

-- All writes are performed server-side using SERVICE_ROLE (bypasses RLS).
-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
