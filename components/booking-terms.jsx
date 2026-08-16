'use client'

import { useEffect, useState } from 'react'
import { normaliseBookingTerms } from '@/lib/booking-terms'

export default function BookingTerms({ checked, onChange }) {
  const [bookingTerms, setBookingTerms] = useState(() => normaliseBookingTerms())

  useEffect(() => {
    fetch('/api/booking-terms')
      .then(response => response.ok ? response.json() : null)
      .then(value => { if (value) setBookingTerms(normaliseBookingTerms(value)) })
      .catch(() => {})
  }, [])

  return (
    <section className="rounded-xl border border-[#d9e2d5] bg-[#f7f9f4] p-4 text-sm text-[#315d4c]">
      <h3 className="font-semibold text-[#173d35]">Booking terms & conditions</h3>
      <p className="mt-1 text-xs text-slate-500">Please read these conditions before continuing.</p>
      <ul className="booking-terms-scrollbar mt-3 max-h-32 list-disc space-y-1 overflow-y-auto overscroll-contain pl-5 text-xs leading-5 text-slate-600 sm:max-h-40">
        {bookingTerms.terms.map(term => <li key={term}>{term}</li>)}
      </ul>
      <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs font-medium text-[#173d35]">
        <input required type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>I have read and agree to the booking terms and conditions (version {bookingTerms.version}).</span>
      </label>
    </section>
  )
}
