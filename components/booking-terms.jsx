'use client'

import { useEffect, useState } from 'react'
import { normaliseBookingTerms } from '@/lib/booking-terms'
import { ScrollText, X, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react'

export default function BookingTerms({ checked, onChange }) {
  const [bookingTerms, setBookingTerms] = useState(() => normaliseBookingTerms())
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    fetch('/api/booking-terms')
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (value) setBookingTerms(normaliseBookingTerms(value)) })
      .catch(() => {})
  }, [])

  return (
    <div className="rounded-2xl border border-[#dfe7dc] bg-[#fbfaf6] p-4 text-xs text-[#173d35]">
      <div className="flex items-start gap-3">
        <input
          id="termsCheckbox"
          required
          type="checkbox"
          checked={checked}
          onChange={event => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#173d35] focus:ring-[#173d35]"
        />
        <label htmlFor="termsCheckbox" className="leading-5 text-slate-700 select-none">
          I have read and agree to the{' '}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="font-semibold text-[#173d35] underline decoration-[#315d4c] underline-offset-2 hover:text-[#315d4c]"
          >
            Terms & Conditions
          </button>
          {' '}(v{bookingTerms.version || '2026'}).
        </label>
      </div>

      {/* Terms & Conditions Modal Popup */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-[#fbfaf6] shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5ebe1] bg-[#173d35] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[#d5b36a]">
                  <ScrollText size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold">Resort Terms & Conditions</h3>
                  <p className="text-[11px] text-emerald-300">Version {bookingTerms.version || '2026'} · Siddhi Farm Resort</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
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
                {bookingTerms.terms.map((term, index) => (
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
                  onChange(true)
                  setIsModalOpen(false)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-5 py-2.5 text-xs font-semibold text-white shadow transition hover:bg-[#205147]"
              >
                <CheckCircle2 size={15} className="text-[#d5b36a]" /> Accept & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
