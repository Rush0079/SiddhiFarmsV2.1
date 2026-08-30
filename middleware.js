import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { verify2FASessionToken } from '@/lib/auth-session'

const DEFAULT_URL = 'https://qkfdyrrotwnskojsxnwj.supabase.co'
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZmR5cnJvdHduc2tvanN4bndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2ODQyOTksImV4cCI6MjEwMjI2MDI5OX0.6J-CV8EfDGbtKgO1VheiKKUE5GcjGaMDubVEwM4mz7I'

export async function middleware(request) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // Security Headers for all requests
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  const isAdminPath = pathname.startsWith('/admin')
  const isJarvisPath = pathname.startsWith('/jarvis')

  // Only guard /admin and /jarvis routes
  if (!isAdminPath && !isJarvisPath) return response

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

  // Check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'customer'
  const isStaffOrAdmin = ['staff', 'manager', 'super_admin'].includes(role)

  if (!isStaffOrAdmin || (isJarvisPath && role !== 'super_admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(url)
  }

  // Enforce 2FA Security Token Verification for all administrative access
  const twoFACookie = request.cookies.get('siddhi_2fa_session')?.value
  const sessionValid = await verify2FASessionToken(twoFACookie)

  if (!sessionValid || sessionValid.userId !== user.id) {
    console.warn(`[MIDDLEWARE:2FA_REQUIRED] Access blocked to ${pathname} for ${user.email} - Missing/invalid 2FA cookie`)
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    url.searchParams.set('reason', '2fa_required')
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/jarvis/:path*'],
}
