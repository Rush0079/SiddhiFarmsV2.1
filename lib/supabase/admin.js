import { createClient } from '@supabase/supabase-js'

// Server-only client using service role — bypasses RLS. NEVER expose to client bundle.
let cached = null
export function supabaseAdmin() {
  if (!cached) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'
    cached = createClient(
      url,
      key,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return cached
}
