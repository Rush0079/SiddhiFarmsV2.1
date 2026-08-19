-- =====================================================================
-- Siddhi Farm Resort — Aadhaar Verification Implementation
-- Run this file ONCE in Supabase → SQL Editor → New Query → Run.
-- Safe to re-run (all statements are idempotent).
-- =====================================================================

-- Add Aadhaar columns to bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS aadhaar_number text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS aadhaar_name text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS aadhaar_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS aadhaar_verification_token text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS aadhaar_verified_at timestamptz;

-- Create aadhaar_verifications table for tracking all verification attempts
CREATE TABLE IF NOT EXISTS public.aadhaar_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  aadhaar_number text NOT NULL,
  aadhaar_name text NOT NULL,
  verification_token text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'expired')),
  verified_at timestamptz,
  otp_sent_at timestamptz,
  otp_attempts int NOT NULL DEFAULT 0,
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create aadhaar_otp_logs for security audit trail
CREATE TABLE IF NOT EXISTS public.aadhaar_otp_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES public.aadhaar_verifications(id) ON DELETE CASCADE,
  otp_entered text, -- hashed OTP for security
  attempt_status text NOT NULL CHECK (attempt_status IN ('success', 'failed')),
  failure_reason text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_aadhaar_verifications_booking ON public.aadhaar_verifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_aadhaar_verifications_status ON public.aadhaar_verifications(status);
CREATE INDEX IF NOT EXISTS idx_aadhaar_verifications_created ON public.aadhaar_verifications(created_at);
CREATE INDEX IF NOT EXISTS idx_aadhaar_otp_logs_verification ON public.aadhaar_otp_logs(verification_id);
CREATE INDEX IF NOT EXISTS idx_bookings_aadhaar_verified ON public.bookings(aadhaar_verified);

-- Enable RLS on new tables
ALTER TABLE public.aadhaar_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aadhaar_otp_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies: admin/staff can read all, users can read their own bookings' verifications
DROP POLICY IF EXISTS "aadhaar_verifications_read_own" ON public.aadhaar_verifications;
CREATE POLICY "aadhaar_verifications_read_own" ON public.aadhaar_verifications 
  FOR SELECT USING (
    auth.uid()::text = booking_id OR -- Check if user owns the booking (rough check)
    EXISTS (
      SELECT 1 FROM public.bookings b 
      WHERE b.id = aadhaar_verifications.booking_id 
      AND b.user_id = auth.uid()
    )
  );

-- Writes are performed server-side using SERVICE_ROLE (bypasses RLS)

-- =====================================================================
-- END OF AADHAAR SCHEMA
-- =====================================================================
