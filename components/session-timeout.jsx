'use client'

import { useEffect, useRef, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes of admin inactivity

export default function SessionTimeout() {
  const router = useRouter()
  const pathname = usePathname()
  const timeoutRef = useRef(null)
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    // Only run inactivity timeout on administrative pages
    if (!pathname || !pathname.startsWith('/admin')) return
    if (!supabase) return

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)

      timeoutRef.current = setTimeout(async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            await supabase.auth.signOut()
            router.push('/login?reason=timeout')
          }
        } catch (err) {
          console.error('Session timeout error:', err)
        }
      }, INACTIVITY_TIMEOUT_MS)
    }

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    resetTimer()

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      events.forEach(event => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [pathname, router, supabase])

  return null
}
