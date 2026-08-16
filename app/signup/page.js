'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, UserPlus, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data, error: err } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.fullName, phone: form.phone },
        },
      })
      if (err) throw err
      // If email confirmations are enabled, user must verify. Otherwise session exists.
      if (data.session) {
        router.push('/')
        router.refresh()
      } else {
        setOk(true)
      }
    } catch (err) {
      setError(err.message || 'Unable to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#173d35] px-5 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-[#fbfaf6] p-9 shadow-2xl">
        <a href="/login" className="mb-6 flex items-center gap-2 text-sm text-[#315d4c]"><ArrowLeft size={16} /> Back to sign in</a>
        <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3eee1] text-[#315d4c]"><UserPlus size={20} /></div>
        <p className="eyebrow">Siddhi Farm Resort</p>
        <h1 className="mt-2 font-serif text-3xl text-[#173d35]">Create your account</h1>
        <p className="mt-2 text-sm text-slate-500">Book stays, day tours and celebrations with a single login.</p>

        {ok ? (
          <div className="mt-8 rounded-2xl bg-[#e5efe4] p-6 text-center text-sm text-[#173d35]">
            <strong>Check your inbox.</strong><br />We just sent a confirmation link to <em>{form.email}</em>. Click it to activate your account, then sign in.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label>Full name<input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></label>
            <label>Email<input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label>Phone<input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></label>
            <label>Password<input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="button-primary w-full" type="submit" disabled={loading}>
              {loading ? <><Loader2 size={17} className="animate-spin" /> Creating account…</> : <>Create account <ArrowRight size={17} /></>}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
