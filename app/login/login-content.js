'use client'

import { useSearchParams } from 'next/navigation'
import { LoginCard } from '@/features/auth'

export default function LoginContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'
  const isTimedOut = searchParams.get('reason') === 'timeout'

  return <LoginCard nextUrl={next} isTimedOut={isTimedOut} />
}

