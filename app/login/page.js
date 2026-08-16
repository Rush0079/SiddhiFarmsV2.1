'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { siteImage } from '@/lib/siteImages'

export default function LoginPage() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState({})

  useEffect(() => {
    fetch('/api/images').then(r => r.json()).then(setImages).catch(() => {})
  }, [])

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (err) throw err

      // Fetch role to decide destination
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role || 'customer'
      if (['staff', 'manager', 'super_admin'].includes(role)) {
        router.push(next.startsWith('/admin') ? next : '/admin')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#173d35] px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-[#fbfaf6] shadow-2xl md:grid-cols-2">
        <div className="login-image hidden min-h-[680px] flex-col justify-between p-10 text-white md:flex" style={{ backgroundImage: `linear-gradient(180deg, rgba(12,42,34,.55), rgba(12,42,34,.85)), url(${siteImage(images, 'loginSide')})`, backgroundPosition: 'center', backgroundSize: 'cover' }}>
          <a href="/" className="flex items-center gap-2 text-sm text-white/75"><ArrowLeft size={16} /> Back to website</a>
          <div>
            <p className="eyebrow text-[#d5b36a]">Siddhi Farm Resort</p>
            <h1 className="mt-4 font-serif text-6xl leading-none">Welcome<br /><em>back.</em></h1>
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/65">Sign in to manage stays, celebrations and every farm-fresh detail.</p>
          </div>
          <p className="text-xs text-white/45">Secure login · Supabase Auth</p>
        </div>
        <div className="p-7 sm:p-12">
          <a href="/" className="mb-12 flex items-center gap-2 text-sm text-[#315d4c] md:hidden"><ArrowLeft size={16} /> Public website</a>
          <div className="mb-9">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3eee1] text-[#315d4c]"><LockKeyhole size={20} /></div>
            <p className="eyebrow">Siddhi Farm Resort</p>
            <h2 className="mt-2 font-serif text-4xl text-[#173d35]">Sign in</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Customers and resort teams both start from here.</p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label>Password<input type="password" required minLength={6} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} /></label>
            <div className="flex gap-3 rounded-xl bg-[#f0f3ec] p-4 text-xs leading-5 text-[#315d4c]">
              <ShieldCheck className="mt-0.5 shrink-0" size={16} />
              <span>Only Super Admin, Manager and Staff accounts can open the admin dashboard. Customers land on the main website after login.</span>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="button-primary w-full" type="submit" disabled={loading}>
              {loading ? <><Loader2 size={17} className="animate-spin" /> Signing in…</> : <>Continue <ArrowRight size={17} /></>}
            </button>
          </form>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400">
            New here? <a href="/signup" className="font-semibold text-[#315d4c] underline">Create a customer account</a>
          </p>
        </div>
      </div>
    </main>
  )
}
