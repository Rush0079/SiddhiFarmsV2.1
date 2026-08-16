-- Run this once in the Supabase SQL Editor for an existing Siddhi Farm database.
alter table public.bookings add column if not exists terms_accepted_at timestamptz;
alter table public.bookings add column if not exists terms_version text;
alter table public.bookings add column if not exists terms_content jsonb;
