'use client'

import { Suspense } from 'react'
import LoginContent from './login-content'
import { LuxuryPageLoader } from '@/components/luxury-loader'

export default function LoginPage() {
  return (
    <Suspense fallback={<LuxuryPageLoader title="Siddhi Admin Portal" subtitle="Initializing security environment..." />}>
      <LoginContent />
    </Suspense>
  )
}
