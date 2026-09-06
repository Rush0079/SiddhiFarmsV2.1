/**
 * ============================================================================
 * SUPER ADMIN OTP MODAL COMPONENT — 2FA Challenge for Privileged Actions
 * ============================================================================
 *
 * @fileoverview  Two-factor authorization modal requiring a 6-digit OTP dispatched
 *                to the verified Super Admin email & phone before sensitive
 *                team provisioning actions can proceed.
 *
 * @module        components/admin/super-admin-otp-modal
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { ShieldCheck, X, Mail, Smartphone, RefreshCw, Loader2 } from 'lucide-react'

/**
 * SuperAdminOtpModal Component
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.authModal    - State object with target details, masked contact info, and cooldown.
 * @param {Function} props.setAuthModal - State updater for authModal.
 * @param {Function} props.onConfirm    - Form submission handler to verify OTP and complete provisioning.
 * @param {Function} props.onResend     - Callback to request a new OTP.
 * @returns {JSX.Element|null}
 */
export default function SuperAdminOtpModal({ authModal, setAuthModal, onConfirm, onResend }) {
  if (!authModal) return null

  console.log('[UI:SuperAdminOtpModal:RENDER] Displaying 2FA challenge modal')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-[#dfe7dc] bg-white p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="eyebrow text-amber-800">Super Admin Security</p>
              <h2 id="auth-modal-title" className="font-serif text-xl text-[#173d35]">
                Authorize Admin Account
              </h2>
            </div>
          </div>
          <button
            onClick={() => setAuthModal(null)}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Provisioning Summary Card */}
        <div className="mt-4 rounded-2xl bg-[#f5f8f3] border border-[#dfe7dc] p-4 text-xs text-slate-700 space-y-1.5">
          <p className="font-bold text-[#173d35]">Provisioning Summary:</p>
          <div className="flex justify-between">
            <span className="text-slate-500">Name:</span>
            <strong className="text-slate-800">{authModal.target?.name}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email:</span>
            <strong className="text-slate-800 font-mono">{authModal.target?.email}</strong>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Assigned Role:</span>
            <span className="rounded-md bg-[#173d35] px-2 py-0.5 text-[11px] font-bold text-white uppercase">
              {authModal.target?.role}
            </span>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          Enter the 6-digit authorization code sent to your Super Admin email &amp; mobile:
        </p>

        <div className="mt-2 space-y-1 text-xs text-[#173d35] bg-[#edf2ea] p-2.5 rounded-xl">
          <div className="flex items-center gap-1.5 font-medium">
            <Mail size={13} className="text-[#315d4c]" />
            <span>
              Email: <strong className="font-mono">{authModal.maskedEmail}</strong>
            </span>
          </div>
          {authModal.maskedPhone && (
            <div className="flex items-center gap-1.5 font-medium">
              <Smartphone size={13} className="text-[#315d4c]" />
              <span>
                Mobile: <strong className="font-mono">{authModal.maskedPhone}</strong>
              </span>
            </div>
          )}
        </div>

        <form onSubmit={onConfirm} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              6-Digit Authorization Code
              <input
                type="text"
                required
                autoFocus
                maxLength={6}
                pattern="[0-9]{6}"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                value={authModal.otp}
                onChange={(e) =>
                  setAuthModal({ ...authModal, otp: e.target.value.replace(/\D/g, '') })
                }
                className="mt-1.5 w-full text-center font-mono text-2xl font-bold tracking-[10px] text-[#173d35] rounded-xl border-2 border-[#173d35]/30 py-2.5 focus:border-[#173d35] focus:bg-white"
              />
            </label>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <button
              type="button"
              onClick={onResend}
              disabled={authModal.resendCooldown > 0}
              className="flex items-center gap-1 font-medium text-[#173d35] hover:underline disabled:opacity-40 cursor-pointer"
            >
              <RefreshCw size={12} />
              {authModal.resendCooldown > 0
                ? `Resend code (${authModal.resendCooldown}s)`
                : 'Resend code'}
            </button>
            <span className="text-[11px] text-slate-400">Expires in 10 mins</span>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              className="button-outline"
              onClick={() => setAuthModal(null)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button-primary flex items-center gap-2"
              disabled={authModal.loading || authModal.otp.length !== 6}
            >
              {authModal.loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <ShieldCheck size={16} />
              )}
              {authModal.loading ? 'Authorizing…' : 'Authorize & Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
