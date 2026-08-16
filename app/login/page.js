'use client'

import { Suspense } from 'react'
import LoginContent from './login-content'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#173d35]"><div className="text-white">Loading...</div></div>}>
      <LoginContent />
    </Suspense>
  )
}
