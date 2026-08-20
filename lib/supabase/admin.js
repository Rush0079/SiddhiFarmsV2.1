import { createClient } from '@supabase/supabase-js'

const DEFAULT_URL = 'https://qkfdyrrotwnskojsxnwj.supabase.co'
const DEFAULT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZmR5cnJvdHduc2tvanN4bndqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY4NDI5OSwiZXhwIjoyMTAyMjYwMjk5fQ.UTBmA8LVfUM8n2MV0dYEv34PB02cp4yt2V18DMCGei4'

// Server-only client using service role — bypasses RLS. NEVER expose to client bundle.
let cached = null
export function supabaseAdmin() {
  if (!cached) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_KEY
    cached = createClient(
      url,
      key,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return cached
}
