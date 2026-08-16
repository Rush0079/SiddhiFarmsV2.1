import { createClient } from '@supabase/supabase-js'

// Server-only client using service role — bypasses RLS. NEVER expose to client bundle.
let cached = null
export function supabaseAdmin() {
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return cached
}
