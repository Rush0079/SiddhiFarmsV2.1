'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes of administrative inactivity
const STORAGE_KEY = 'siddhi_admin_last_active'

export default function SessionTimeout() {
  const router = useRouter()
  const pathname = usePathname()
  const lastUpdateRef = useRef(Date.now())

  useEffect(() => {
    // Only enforce session timeout on administrative routes
    if (!pathname || !pathname.startsWith('/admin')) return

    let isTerminating = false

    const performSignOut = async () => {
      if (isTerminating) return
      isTerminating = true

      try {
        console.warn('[SESSION:TIMEOUT] Admin inactivity threshold reached. Logging out...')
        const supabase = createSupabaseBrowserClient()
        await supabase.auth.signOut().catch(() => {})

        // Clear 2FA Session Cookie
        document.cookie = 'siddhi_2fa_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax;'
        localStorage.removeItem(STORAGE_KEY)

        // Redirect to login with timeout notice
        router.push('/login?reason=timeout')
        router.refresh()
      } catch (err) {
        console.error('[SESSION:TIMEOUT_ERROR]', err)
        router.push('/login?reason=timeout')
      }
    }

    const updateActivity = () => {
      const now = Date.now()
      // Throttle localStorage writes to once every 2 seconds
      if (now - lastUpdateRef.current > 2000) {
        lastUpdateRef.current = now
        try {
          localStorage.setItem(STORAGE_KEY, String(now))
        } catch {}
      }
    }

    const checkInactivity = () => {
      let lastActive = lastUpdateRef.current
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) lastActive = Math.max(lastActive, Number(stored) || 0)
      } catch {}

      const elapsed = Date.now() - lastActive
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        performSignOut()
      }
    }

    // Initialize activity on mount
    updateActivity()

    // Activity event listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }))

    // Heartbeat check interval (every 5 seconds)
    const interval = setInterval(checkInactivity, 5000)

    // Visibility / Tab focus check (triggers instantly when user switches back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkInactivity()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkInactivity)

    return () => {
      clearInterval(interval)
      events.forEach(e => window.removeEventListener(e, updateActivity))
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkInactivity)
    }
  }, [pathname, router])

  return null
}

