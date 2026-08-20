'use client'
import { createBrowserClient } from '@supabase/ssr'

const DEFAULT_URL = 'https://qkfdyrrotwnskojsxnwj.supabase.co'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZmR5cnJvdHduc2tvanN4bndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODQyOTksImV4cCI6MjEwMjI2MDI5OX0.6J-CV8EfDGbtKgO1VheiKKUE5GcjGaMDubVEwM4mz7I'

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY
  return createBrowserClient(url, key)
}

