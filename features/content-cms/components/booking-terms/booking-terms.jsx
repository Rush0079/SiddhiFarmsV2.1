'use client'

import React, { useEffect, useState } from 'react'
import { normaliseBookingTerms } from '@/lib/booking-terms'
import { ScrollText, X, CheckCircle2, ShieldCheck } from 'lucide-react'
import { BookingTermsDefaults } from './booking-terms.model'
import styles from './booking-terms.module.css'

export default function BookingTerms({ checked, onChange }) {
  const [bookingTerms, setBookingTerms] = useState(() => normaliseBookingTerms())
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/booking-terms')
      .then((response) => (response.ok ? response.json() : null))
      .then((value) => {
        if (value) setBookingTerms(normaliseBookingTerms(value))
      })
      .catch(() => {})
  }, [])

  return (
    <div className={styles.termsContainer}>
      <div className="flex items-start gap-3">
        <input
          id="termsCheckbox"
          required
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange?.(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#173d35] focus:ring-[#173d35]"
        />
        <label htmlFor="termsCheckbox" className="leading-5 text-slate-700 select-none">
          {BookingTermsDefaults.CHECKBOX_LABEL_PREFIX}{' '}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="font-semibold text-[#173d35] underline decoration-[#315d4c] underline-offset-2 hover:text-[#315d4c] cursor-pointer"
          >
            {BookingTermsDefaults.CHECKBOX_LINK_TEXT}
          </button>{' '}
          (v{bookingTerms.version || BookingTermsDefaults.FALLBACK_VERSION}).
        </label>
      </div>

      {/* Terms & Conditions Modal Popup */}
      {isModalOpen && (
        <div className={`${styles.modalBackdrop} animate-in fade-in duration-200`}>
          <div className={styles.modalDialog}>
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5ebe1] bg-[#173d35] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#d5b36a]">
                  <ScrollText size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">{BookingTermsDefaults.MODAL_TITLE}</h3>
                  <p className="text-[11px] text-emerald-300">
                    Version {bookingTerms.version || BookingTermsDefaults.FALLBACK_VERSION} · {BookingTermsDefaults.MODAL_SUBTITLE_SUFFIX}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 text-slate-700">
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 border border-emerald-200">
                <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
                <span>Please review our house rules and stay guidelines before confirming your reservation.</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed">
                {bookingTerms.terms?.map((term, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-xl border border-[#dfe7dc] bg-white p-3.5 shadow-xs">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e3eee1] text-[10px] font-bold text-[#173d35]">
                      {index + 1}
                    </span>
                    <p className="flex-1 text-slate-700 leading-normal">{term}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-[#e5ebe1] bg-white px-6 py-4">
              <span className="text-[11px] text-slate-500">A copy is also sent with your tax invoice.</span>
              <button
                type="button"
                onClick={() => {
                  onChange?.(true)
                  setIsModalOpen(false)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-[#205147] cursor-pointer"
              >
                <CheckCircle2 size={15} className="text-[#d5b36a]" /> {BookingTermsDefaults.CONFIRM_BUTTON_TEXT}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
