-- Run this once in the Supabase SQL Editor for an existing Siddhi Farm database.
alter table public.bookings add column if not exists check_in_time time;
alter table public.bookings add column if not exists check_out_time time;
