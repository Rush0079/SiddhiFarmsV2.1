'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowRight, LockKeyhole, ShieldCheck, Loader2, Clock, Smartphone, Mail, RefreshCw, KeyRound } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { siteImage } from '@/lib/siteImages'
import { executeRecaptcha } from '@/lib/recaptcha-client'
import { LuxuryOverlayLoader } from '@/components/luxury-loader'

export default function LoginContent() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/admin'
  const isTimedOut = params.get('reason') === 'timeout'

  const [step, setStep] = useState('credentials') // 'credentials' | 'otp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [otpExpiry, setOtpExpiry] = useState(600)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)
  const [images, setImages] = useState({})
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)

  useEffect(() => {
    fetch('/api/images').then(r => r.json()).then(setImages).catch(() => {})
  }, [])

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds(prev => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  async function submitCredentials(event) {
    event.preventDefault()
    if (lockoutSeconds > 0) return

    setError('')
    setLoading(true)
    try {
      // Execute reCAPTCHA v3 bot analysis
      await executeRecaptcha('login_submit').catch(() => null)

      const cleanEmail = email.trim().toLowerCase()
      const supabase = createSupabaseBrowserClient()
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      if (err) throw err

      // Reset attempts on successful authentication
      setFailedAttempts(0)

      // Fetch role to determine if 2FA OTP is required
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, phone')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role || 'customer'
      const isAdminRole = ['staff', 'manager', 'super_admin'].includes(role)

      if (isAdminRole) {
        // Dispatch 2FA OTP to admin email & phone
        const res = await fetch('/api/auth/2fa/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        })
        const otpData = await res.json().catch(() => ({}))

        if (res.ok && otpData.requires2FA) {
          setMaskedEmail(otpData.maskedEmail || cleanEmail)
          setMaskedPhone(otpData.maskedPhone || '')
          setResendCooldown(45)
          setStep('otp')
          setLoading(false)
          return
        }
      }

      // Non-admin customer proceeds directly
      router.push('/')
      router.refresh()
    } catch (err) {
      const nextFailed = failedAttempts + 1
      setFailedAttempts(nextFailed)

      // Brute-force throttling: 5 failed attempts locks for 30s
      if (nextFailed >= 5) {
        setLockoutSeconds(30)
        setFailedAttempts(0)
        setError('Too many failed login attempts. Account temporarily locked for 30 seconds to prevent unauthorized access.')
        return
      }

      if (err?.message === 'Failed to fetch' || (err?.message || '').includes('fetch')) {
        setError('Network connection issue. Please try again.')
      } else if ((err?.message || '').toLowerCase().includes('invalid login credentials')) {
        setError(`Invalid email or password. (${5 - nextFailed} attempt${5 - nextFailed === 1 ? '' : 's'} remaining before temporary cooldown)`)
      } else {
        setError(err.message || 'Unable to sign in. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitOTP(event) {
    event.preventDefault()
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the full 6-digit verification code.')
      return
    }

    setError('')
    setVerifyingOtp(true)
    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otpCode: otpCode.trim(),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Verification code failed. Please check and try again.')
      }

      // Verification successful: trigger luxury redirecting loader & navigate
      setRedirecting(true)
      router.push(next.startsWith('/admin') ? next : '/admin')
      router.refresh()
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.')
      setRedirecting(false)
    } finally {
      setVerifyingOtp(false)
    }
  }

  async function resendOTP() {
    if (resendCooldown > 0 || resendingOtp) return
    setError('')
    setResendingOtp(true)
    try {
      const res = await fetch('/api/auth/2fa/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setResendCooldown(60)
        setMaskedEmail(data.maskedEmail || maskedEmail)
        setMaskedPhone(data.maskedPhone || maskedPhone)
      } else {
        setError(data.error || 'Failed to resend code. Please try again in a few moments.')
      }
    } catch (err) {
      setError('Failed to resend code due to network error.')
    } finally {
      setResendingOtp(false)
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
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/65">Experience nature, luxury villas, and peaceful countryside stays.</p>
          </div>
        </div>
        <div className="p-7 sm:p-12">
          <a href="/" className="mb-12 flex items-center gap-2 text-sm text-[#315d4c] md:hidden"><ArrowLeft size={16} /> Public website</a>

          {step === 'credentials' ? (
            <div>
              <div className="mb-9">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e3eee1] text-[#315d4c]"><LockKeyhole size={20} /></div>
                <p className="eyebrow">Siddhi Farm Resort</p>
                <h2 className="mt-2 font-serif text-4xl text-[#173d35]">Sign in</h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">Please enter your account details to access your account.</p>
              </div>

              {isTimedOut && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
                  <Clock className="mt-0.5 shrink-0 text-amber-700" size={16} />
                  <div>
                    <p className="font-bold text-amber-900">Session Timed Out</p>
                    <p className="mt-0.5 text-amber-800 leading-5">Your session expired after 1 minute of inactivity for security. Please sign in again.</p>
                  </div>
                </div>
              )}

              <form onSubmit={submitCredentials} className="space-y-5">
                <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
                <label>Password<input type="password" required minLength={6} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} /></label>
                <div className="flex gap-3 rounded-xl bg-[#f0f3ec] p-4 text-xs leading-5 text-[#315d4c]">
                  <ShieldCheck className="mt-0.5 shrink-0" size={16} />
                  <span>Protected by secure encrypted authentication protocols.</span>
                </div>
                {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
                <button className="button-primary w-full" type="submit" disabled={loading || lockoutSeconds > 0}>
                  {loading ? (
                    <><Loader2 size={17} className="animate-spin" /> Verifying credentials…</>
                  ) : lockoutSeconds > 0 ? (
                    <><Clock size={16} /> Temporarily locked ({lockoutSeconds}s)</>
                  ) : (
                    <>Continue <ArrowRight size={17} /></>
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div>
              {/* Step 2: Verification Code */}
              <div className="mb-8">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <KeyRound size={22} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">Secure Access</span>
                  <p className="eyebrow text-[#315d4c]">Verification</p>
                </div>
                <h2 className="mt-2 font-serif text-3xl text-[#173d35]">Enter Verification Code</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  We sent a 6-digit verification code to your registered contacts:
                </p>
                <div className="mt-3 space-y-1 text-xs font-semibold text-slate-700 bg-[#f3f6f0] p-3 rounded-xl border border-[#dfe7dc]">
                  <div className="flex items-center gap-2 text-[#173d35]">
                    <Mail size={14} className="text-[#315d4c]" />
                    <span>Email: <strong className="font-mono">{maskedEmail}</strong></span>
                  </div>
                  {maskedPhone && (
                    <div className="flex items-center gap-2 text-[#173d35]">
                      <Smartphone size={14} className="text-[#315d4c]" />
                      <span>Mobile: <strong className="font-mono">{maskedPhone}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              <form onSubmit={submitOTP} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    6-Digit Verification Code
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      pattern="[0-9]{6}"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="mt-2 w-full text-center font-mono text-3xl font-bold tracking-[12px] text-[#173d35] rounded-xl border-2 border-[#173d35]/30 py-3 focus:border-[#173d35] focus:bg-white"
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-400 text-center">Code expires in 10 minutes. Single-use only.</p>
                </div>

                {error && <p className="rounded-lg bg-red-50 p-2.5 text-center text-xs font-medium text-red-600 border border-red-200">{error}</p>}

                <button
                  className="button-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
                  type="submit"
                  disabled={verifyingOtp || otpCode.length !== 6}
                >
                  {verifyingOtp ? (
                    <><Loader2 size={18} className="animate-spin" /> Verifying Code…</>
                  ) : (
                    <>Verify &amp; Sign In <ArrowRight size={18} /></>
                  )}
                </button>

                <div className="flex items-center justify-between pt-2 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setOtpCode(''); setError('') }}
                    className="text-[#315d4c] hover:underline font-medium"
                  >
                    ← Sign in with another account
                  </button>

                  <button
                    type="button"
                    onClick={resendOTP}
                    disabled={resendCooldown > 0 || resendingOtp}
                    className="flex items-center gap-1.5 font-medium text-[#173d35] hover:underline disabled:opacity-40"
                  >
                    {resendingOtp ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : 'Resend code'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {redirecting && (
        <LuxuryOverlayLoader
          title="Staff 2FA Verified"
          subtitle="Launching Admin Operations Center..."
          progressMessage="Securing session & loading live resort metrics"
        />
      )}
    </main>
  )
}
