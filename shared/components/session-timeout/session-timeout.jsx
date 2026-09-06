'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { SessionTimeoutConfig, isSessionExpired } from './session-timeout.model'
import styles from './session-timeout.module.css'

export default function SessionTimeout() {
  const router = useRouter()
  const pathname = usePathname()
  const lastUpdateRef = useRef(Date.now())

  useEffect(() => {
    // Only enforce session timeout on administrative routes
    const isAdministrative = pathname && (pathname.startsWith('/admin') || pathname.startsWith('/jarvis'))
    if (!isAdministrative) return

    let isTerminating = false

    const performSignOut = async () => {
      if (isTerminating) return
      isTerminating = true

      console.warn('[SESSION:TIMEOUT] Admin inactivity threshold reached (1 min). Logging out...')

      // 1. Immediately invalidate local token and storage
      try {
        localStorage.removeItem(SessionTimeoutConfig.STORAGE_KEY)
      } catch {}

      document.cookie = `${SessionTimeoutConfig.COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax;`

      // 2. Clear server-side HTTP-only 2FA session cookie (fire & forget with keepalive)
      try {
        fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {})
      } catch {}

      // 3. Trigger Supabase sign out
      try {
        const supabase = createSupabaseBrowserClient()
        supabase?.auth?.signOut()?.catch(() => {})
      } catch {}

      // 4. Hard redirect to login with timeout notice
      window.location.href = '/login?reason=timeout'
    }

    const updateActivity = () => {
      const now = Date.now()
      // Throttle localStorage writes
      if (now - lastUpdateRef.current > SessionTimeoutConfig.WRITE_THROTTLE_MS) {
        lastUpdateRef.current = now
        try {
          localStorage.setItem(SessionTimeoutConfig.STORAGE_KEY, String(now))
        } catch {}
      }
    }

    const checkInactivity = () => {
      let lastActive = lastUpdateRef.current
      try {
        const stored = localStorage.getItem(SessionTimeoutConfig.STORAGE_KEY)
        if (stored) lastActive = Math.max(lastActive, Number(stored) || 0)
      } catch {}

      if (isSessionExpired(lastActive, Date.now(), SessionTimeoutConfig.INACTIVITY_TIMEOUT_MS)) {
        performSignOut()
      }
    }

    // Check if prior session stored in localStorage is already expired on mount
    try {
      const stored = localStorage.getItem(SessionTimeoutConfig.STORAGE_KEY)
      const lastActive = stored ? Number(stored) || 0 : 0
      if (lastActive > 0 && isSessionExpired(lastActive, Date.now(), SessionTimeoutConfig.INACTIVITY_TIMEOUT_MS)) {
        performSignOut()
        return
      }
    } catch {}

    // Initialize activity on mount
    lastUpdateRef.current = Date.now()
    try {
      localStorage.setItem(SessionTimeoutConfig.STORAGE_KEY, String(Date.now()))
    } catch {}

    // Activity event listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }))

    // Heartbeat check interval
    const interval = setInterval(checkInactivity, SessionTimeoutConfig.HEARTBEAT_INTERVAL_MS)

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

  return <span className={styles.hiddenSentinel} aria-hidden="true" />
}
