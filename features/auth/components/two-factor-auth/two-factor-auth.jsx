'use client'

import { Clock, Smartphone, Mail, RefreshCw, KeyRound, Loader2, ArrowLeft, ArrowRight } from 'lucide-react'
import styles from './two-factor-auth.module.css'
import { TwoFactorAuthDefaults, formatCountdown } from './two-factor-auth.model'

export default function TwoFactorAuth({
  otpCode = '',
  setOtpCode,
  maskedEmail = '',
  maskedPhone = '',
  otpExpiry = 600,
  resendCooldown = 0,
  verifying = false,
  resending = false,
  onSubmit,
  onResend,
  onBack,
}) {
  return (
    <form onSubmit={onSubmit} className={styles.twoFactorCard}>
      {/* Notification badge showing dispatched channels */}
      <div className={styles.channelBadge}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#d5b36a]/15 text-[#d5b36a]">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-medium text-white/90">
            One-time verification code sent
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
            {maskedEmail && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3 text-[#d5b36a]" /> {maskedEmail}
              </span>
            )}
            {maskedPhone && (
              <span className="flex items-center gap-1">
                <Smartphone className="h-3 w-3 text-emerald-400" /> {maskedPhone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expiry Countdown */}
      <div className="flex items-center justify-between text-xs text-white/60 px-1">
        <span className="flex items-center gap-1.5 font-mono">
          <Clock className="h-3.5 w-3.5 text-[#d5b36a]" /> Expires in:
        </span>
        <span className="font-mono font-bold text-[#d5b36a]">
          {formatCountdown(otpExpiry)}
        </span>
      </div>

      {/* Large 6-Digit OTP Field */}
      <div className={styles.otpInputGroup}>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="one-time-code"
          value={otpCode}
          onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className={styles.otpField}
          autoFocus
          required
        />
      </div>

      {/* Verify Action Button */}
      <button
        type="submit"
        disabled={verifying || otpCode.length !== 6}
        className="w-full rounded-xl bg-gradient-to-r from-[#d5b36a] to-[#b89547] py-3 px-4 font-bold text-[#0c2a22] shadow-lg shadow-[#d5b36a]/20 transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {verifying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying Code...
          </>
        ) : (
          <>
            {TwoFactorAuthDefaults.VERIFY_BUTTON_TEXT} <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      {/* Secondary Controls: Back & Resend */}
      <div className={styles.actionRow}>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to credentials
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || resending}
          className="flex items-center gap-1.5 text-xs text-[#d5b36a] hover:underline disabled:opacity-40 disabled:no-underline"
        >
          {resending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend Code'}
        </button>
      </div>
    </form>
  )
}
