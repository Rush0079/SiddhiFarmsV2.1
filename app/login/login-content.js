'use client'

import { useSearchParams } from 'next/navigation'
import { LoginCard } from '@/features/auth'

export default function LoginContent() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/admin'
  const isTimedOut = searchParams.get('reason') === 'timeout'

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0c2a22] via-[#071a15] to-[#040e0b] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[32rem] w-[32rem] rounded-full bg-[#d5b36a]/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-emerald-600/10 blur-[120px]" />

      <LoginCard nextUrl={next} isTimedOut={isTimedOut} />
    </div>
  )
}
