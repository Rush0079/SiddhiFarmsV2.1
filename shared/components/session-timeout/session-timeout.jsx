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
        document.cookie = `${SessionTimeoutConfig.COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax;`
        localStorage.removeItem(SessionTimeoutConfig.STORAGE_KEY)

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

    // Initialize activity on mount
    updateActivity()

    // Activity event listeners
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, updateActivity, { passive: true }))

    // Heartbeat check interval
    const interval = setInterval(checkInactivity, SessionTimeoutConfig.HEARTBEAT_INTERVAL_MS)

    // Visibility / Tab focus check
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
