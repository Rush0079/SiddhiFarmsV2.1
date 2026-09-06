'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LockKeyhole, ShieldCheck, Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import SiddhiLogo from '@/shared/components/siddhi-logo/siddhi-logo'
import { LuxuryOverlayLoader } from '@/shared/components/luxury-loader/luxury-loader'
import TwoFactorAuth from '../two-factor-auth/two-factor-auth'
import { AuthService } from '../../services/auth.service'
import { AuthStep, AuthConfig } from '../../models/auth.model'
import { LoginCardDefaults, validateLoginInput } from './login-card.model'
import styles from './login-card.module.css'

export default function LoginCard({
  nextUrl = '/admin',
  isTimedOut = false,
}) {
  const router = useRouter()

  const [step, setStep] = useState(AuthStep.CREDENTIALS)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [maskedPhone, setMaskedPhone] = useState('')
  const [otpExpiry, setOtpExpiry] = useState(AuthConfig.OTP_EXPIRY_SECONDS)
  const [resendCooldown, setResendCooldown] = useState(0)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [resendingOtp, setResendingOtp] = useState(false)

  // Handle Credentials submission
  async function handleSubmitCredentials(e) {
    e.preventDefault()
    setError('')

    const validation = validateLoginInput({ email, password })
    if (!validation.valid) {
      setError(validation.error)
      return
    }

    setLoading(true)
    try {
      const result = await AuthService.verifyCredentials({ email, password })
      if (!result.success) {
        setError(result.error || 'Invalid credentials')
        setLoading(false)
        return
      }

      // Credentials verified, now trigger 2FA OTP request
      const otpResult = await AuthService.requestTwoFactorOtp({ email })
      if (!otpResult.success) {
        setError(otpResult.error || 'Failed to dispatch 2FA code')
        setLoading(false)
        return
      }

      setMaskedEmail(otpResult.maskedEmail || email)
      setMaskedPhone(otpResult.maskedPhone || '')
      setStep(AuthStep.OTP)
      setResendCooldown(AuthConfig.RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setError('An unexpected error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP Verification submission
  async function handleSubmitOtp(e) {
    e.preventDefault()
    if (otpCode.length !== AuthConfig.OTP_LENGTH) return

    setError('')
    setVerifyingOtp(true)
    try {
      const verifyResult = await AuthService.verifyTwoFactorOtp({ email, otpCode })
      if (!verifyResult.success) {
        setError(verifyResult.error || 'Invalid verification code')
        setVerifyingOtp(false)
        return
      }

      setRedirecting(true)
      router.push(nextUrl)
      router.refresh()
    } catch (err) {
      setError('Verification service unavailable')
      setVerifyingOtp(false)
    }
  }

  // Handle Resend OTP
  async function handleResendOtp() {
    if (resendCooldown > 0 || resendingOtp) return
    setResendingOtp(true)
    setError('')
    try {
      const res = await AuthService.requestTwoFactorOtp({ email })
      if (res.success) {
        setResendCooldown(AuthConfig.RESEND_COOLDOWN_SECONDS)
        setOtpExpiry(AuthConfig.OTP_EXPIRY_SECONDS)
      } else {
        setError(res.error || 'Failed to resend code')
      }
    } catch {
      setError('Error resending OTP')
    } finally {
      setResendingOtp(false)
    }
  }

  return (
    <>
      <LuxuryOverlayLoader
        show={redirecting}
        title="Securing Admin Session"
        subtitle="Entering administrative dashboard..."
      />

      <div className={styles.cardContainer}>
        <div className={styles.ambientGlowTop} />
        <div className={styles.ambientGlowBottom} />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <SiddhiLogo variant="full" className="mb-2" />
          <p className="mt-1 text-xs text-white/60 max-w-xs">
            {LoginCardDefaults.SUBTITLE}
          </p>
        </div>

        {/* Session Timeout Warning */}
        {isTimedOut && (
          <div className={`mt-4 ${styles.timeoutNotice}`}>
            <LockKeyhole className="h-4 w-4 text-[#d5b36a] shrink-0" />
            <span>{LoginCardDefaults.TIMEOUT_MESSAGE}</span>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className={`mt-4 ${styles.errorBanner}`}>
            {error}
          </div>
        )}

        <div className="mt-6">
          {step === AuthStep.CREDENTIALS ? (
            <form onSubmit={handleSubmitCredentials} className={styles.formGrid}>
              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@siddhifarms.com"
                  className={styles.inputField}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/80 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={styles.inputField}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-xl bg-gradient-to-r from-[#d5b36a] to-[#b89547] py-3 px-4 font-bold text-[#0c2a22] shadow-lg shadow-[#d5b36a]/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    {LoginCardDefaults.SUBMIT_BUTTON_TEXT} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mt-2 text-center">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" /> Return to Siddhi Farm Resort
                </Link>
              </div>
            </form>
          ) : (
            <TwoFactorAuth
              otpCode={otpCode}
              setOtpCode={setOtpCode}
              maskedEmail={maskedEmail}
              maskedPhone={maskedPhone}
              otpExpiry={otpExpiry}
              resendCooldown={resendCooldown}
              verifying={verifyingOtp}
              resending={resendingOtp}
              onSubmit={handleSubmitOtp}
              onResend={handleResendOtp}
              onBack={() => setStep(AuthStep.CREDENTIALS)}
            />
          )}
        </div>
      </div>
    </>
  )
}
