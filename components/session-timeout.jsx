'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

const INACTIVITY_TIMEOUT_MS = 60 * 1000 // 1 minute of inactivity

export default function SessionTimeout() {
  const router = useRouter()
  const pathname = usePathname()
  const timeoutRef = useRef(null)
  const supabase = createSupabaseBrowserClient()

  useEffect(() => {
    // Do not run timeout on public login page
    if (pathname === '/login') return

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

    // Interaction events to detect user activity
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

    events.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    // Start timer on initial mount
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
