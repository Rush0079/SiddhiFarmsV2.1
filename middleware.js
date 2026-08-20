import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const DEFAULT_URL = 'https://qkfdyrrotwnskojsxnwj.supabase.co'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZmR5cnJvdHduc2tvanN4bndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODQyOTksImV4cCI6MjEwMjI2MDI5OX0.6J-CV8EfDGbtKgO1VheiKKUE5GcjGaMDubVEwM4mz7I'

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Only guard the admin area
  if (!pathname.startsWith('/admin')) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Check role — only staff/manager/super_admin may enter /admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['staff', 'manager', 'super_admin'].includes(profile.role)) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
