'use client'

import React from 'react'
import { ShieldCheck, X, Mail, Smartphone, RefreshCw, Loader2 } from 'lucide-react'
import { SuperAdminOtpDefaults } from './super-admin-otp-dialog.model'
import styles from './super-admin-otp-dialog.module.css'

export default function SuperAdminOtpDialog({ authModal, setAuthModal, onConfirm, onResend }) {
  if (!authModal) return null

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className={`${styles.modalCard} animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="eyebrow text-amber-800">{SuperAdminOtpDefaults.SUBTITLE}</p>
              <h2 id="auth-modal-title" className="font-serif text-xl text-[#173d35]">
                {SuperAdminOtpDefaults.TITLE}
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
                className={styles.otpInput}
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
              {authModal.loading ? 'Authorizing…' : SuperAdminOtpDefaults.CONFIRM_BUTTON_TEXT}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
