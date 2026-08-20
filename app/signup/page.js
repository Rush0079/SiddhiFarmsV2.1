'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    // Public signup is disabled; accounts are provisioned via Admin desk.
    router.replace('/login')
  }, [router])

  return null
}
