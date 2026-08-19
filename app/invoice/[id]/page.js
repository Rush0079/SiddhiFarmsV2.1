'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Printer,
  Share2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Calendar,
  Users,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import { BOOKING_TERMS } from '@/lib/booking-terms'

function displayTime(value, fallback) {
  const [hours, minutes] = String(value || fallback).split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes || 0).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

export default function InvoicePage() {
  const params = useParams()
  const router = useRouter()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadBooking() {
      try {
        const res = await fetch(`/api/bookings/public/${params.id}`)
        if (!res.ok) throw new Error('Booking invoice not found')
        const data = await res.json()
        setBooking(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) loadBooking()
  }, [params.id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5ef] text-[#173d35]">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#315d4c]" />
          <p className="mt-3 text-sm font-medium">Generating official PDF invoice…</p>
        </div>
      </div>
    )
  }

  if (error || !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5ef] p-4 text-[#173d35]">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 font-serif text-2xl">Invoice Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">We couldn't retrieve the reservation invoice for ID "{params.id}".</p>
          <Link href="/" className="button-primary mt-6 inline-flex">Return Home</Link>
        </div>
      </div>
    )
  }

  const isAdvance = Number(booking.pending_amount || 0) > 0
  const isPaid = booking.paid
  const totalAmount = Number(booking.total_amount || (Number(booking.amount || 0) + Number(booking.pending_amount || 0)))
  const paidAmount = Number(booking.paid_amount || (isPaid ? booking.amount : 0))
  const pendingAmount = Number(booking.pending_amount || (isAdvance ? totalAmount - paidAmount : 0))
  const rawTerms = Array.isArray(booking.terms_content) && booking.terms_content.length ? booking.terms_content : BOOKING_TERMS
  const terms = Array.isArray(rawTerms) ? rawTerms : []

  const isEvent = ['Engagement Ceremony', 'Birthday Party', 'Get Together', 'Wedding Ceremony'].includes(booking.service)
  const isDayTour = ['One Day Tour', 'Mini Water Park', 'One Day Tour + Mini Water Park', 'One Day Tour + Mini Adventure Park'].includes(booking.service)
  const isShortStay = booking.stay_type === 'short_stay' || (booking.notes || '').includes('Short Stay') || (booking.check_in === booking.check_out && !isEvent && !isDayTour)

  const handlePrint = () => {
    window.print()
  }

  const handleWhatsApp = () => {
    const url = getWhatsAppShareUrl(booking)
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-[#f3f5ef] py-8 text-[#173d35] print:bg-white print:p-0 print:text-black">
      {/* Top Action Bar (Hidden in print/PDF) */}
      <div className="container mx-auto mb-6 max-w-4xl px-4 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#dfe7dc] bg-white p-4 shadow-sm">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#315d4c] hover:underline">
            <ArrowLeft size={16} /> Back to Resort
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a]"
            >
              <Share2 size={16} /> Share via WhatsApp
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f4e44]"
            >
              <Printer size={16} /> Download / Print PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Printable Invoice Card */}
      <main className="container mx-auto max-w-4xl px-4 print:max-w-none print:px-0">
        <div className="overflow-hidden rounded-3xl border border-[#dfe7dc] bg-white shadow-xl print:rounded-none print:border-none print:shadow-none">
          {/* Invoice Header */}
          <div className="border-b border-[#dfe7dc] bg-[#173d35] p-8 text-white print:bg-[#173d35] print:text-white">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#d5b36a]">Official Tax Invoice & Receipt</p>
                <h1 className="mt-1 font-serif text-3xl sm:text-4xl">Siddhi Farm Resort</h1>
                <p className="mt-2 text-xs text-white/70">A luxury agro-tourism getaway · Maharashtra, India</p>
                <p className="text-xs text-white/70">Helpline: +91 7083682768 · info@siddhifarm.com</p>
              </div>
              <div className="text-right">
                <div className="inline-block rounded-2xl bg-white/10 px-4 py-2 text-left backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Invoice Number</p>
                  <p className="font-mono text-base font-bold text-[#d5b36a]">{booking.id}</p>
                  <p className="mt-1 text-[10px] text-white/60">Date: {new Date(booking.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="mt-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${isPaid && !isAdvance ? 'bg-emerald-400 text-emerald-950' : isAdvance ? 'bg-amber-400 text-amber-950' : 'bg-slate-200 text-slate-900'}`}>
                    <CheckCircle2 size={13} />
                    {isPaid && !isAdvance ? 'PAID IN FULL' : isAdvance ? 'ADVANCE PAID (BALANCE DUE)' : 'UNPAID / PENDING'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 sm:p-10">
            {/* Bill To & Stay Summary */}
            <div className="grid gap-8 border-b border-[#eef2eb] pb-8 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Guest Information</p>
                <h2 className="mt-2 font-serif text-xl text-slate-900">{booking.name}</h2>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5"><Phone size={13} className="text-slate-400" /> {booking.phone}</p>
                  {booking.email && <p className="flex items-center gap-1.5">✉ {booking.email}</p>}
                  {booking.aadhaar_number && (
                    <p className="flex items-center gap-1.5 font-medium text-slate-800">
                      <ShieldCheck size={13} className="text-emerald-700" /> Govt ID (Aadhaar): {booking.aadhaar_number}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#dfe7dc] bg-[#fbfdf9] p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Reservation Summary</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">{isEvent ? 'Event Date:' : isShortStay ? 'Visit Date:' : 'Check-in:'}</span>
                    <p className="font-semibold text-slate-800">{booking.check_in}</p>
                    <p className="text-[11px] text-slate-500">{isEvent ? 'Start: ' : 'From '}{displayTime(booking.check_in_time, isEvent ? '09:00' : isShortStay ? '10:00' : '11:00')}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">{isEvent ? 'Event Closure:' : isShortStay ? 'Slot End:' : 'Check-out:'}</span>
                    <p className="font-semibold text-slate-800">{booking.check_out}</p>
                    <p className="text-[11px] text-slate-500">{isEvent ? 'Till: ' : 'By '}{displayTime(booking.check_out_time, isEvent ? '22:00' : isShortStay ? '15:00' : '10:00')}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Service / Occasion:</span>
                    <p className="font-semibold text-slate-800">{booking.service}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Guests & Duration:</span>
                    <p className="font-semibold text-slate-800">
                      {booking.guests} Guests · {isEvent ? '1 Day Event' : isShortStay ? '4-5 Hrs Short Stay' : isDayTour ? '1 Day Tour' : `${booking.nights} Night(s)`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Billing Breakdown</p>
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#dfe7dc] text-xs uppercase tracking-wider text-slate-400">
                    <th className="pb-3">Description</th>
                    <th className="pb-3 text-center">Units / Nights</th>
                    <th className="pb-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eef2eb]">
                  <tr>
                    <td className="py-4">
                      <p className="font-semibold text-slate-900">{booking.service}</p>
                      <p className="text-xs text-slate-500">Stay from {booking.check_in} to {booking.check_out}</p>
                    </td>
                    <td className="py-4 text-center text-slate-600">{booking.nights}</td>
                    <td className="py-4 text-right font-medium text-slate-900">
                      ₹{(totalAmount + Number(booking.discount || 0)).toLocaleString('en-IN')}
                    </td>
                  </tr>

                  {booking.discount > 0 && (
                    <tr className="text-emerald-700">
                      <td className="py-3">
                        <p className="font-medium">Special Promotion / Coupon Discount</p>
                        {booking.applied_coupon && <p className="text-xs">Coupon Code: {booking.applied_coupon}</p>}
                      </td>
                      <td className="py-3 text-center">—</td>
                      <td className="py-3 text-right font-medium">−₹{Number(booking.discount).toLocaleString('en-IN')}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Total Summary */}
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-xs space-y-2 rounded-2xl bg-[#f8faf7] p-5 text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Stay Value</span>
                    <span className="font-semibold text-slate-900">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-800">
                    <span className="flex items-center gap-1"><CheckCircle2 size={14} /> Amount Paid</span>
                    <span className="font-bold text-emerald-900">−₹{paidAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-[#dfe7dc] pt-2">
                    <div className="flex justify-between text-base font-bold text-[#173d35]">
                      <span>{pendingAmount > 0 ? 'Pending Balance' : 'Balance Due'}</span>
                      <span className={pendingAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}>
                        ₹{pendingAmount.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {pendingAmount > 0 && (
                      <p className="mt-1 text-right text-[11px] text-amber-800 font-medium">
                        Due at check-in (Cash / UPI / Card)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions Section */}
            <div className="mt-10 border-t border-[#dfe7dc] pt-8">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-[#315d4c]" />
                <h3 className="font-serif text-lg text-slate-900">Resort Terms & Conditions and House Rules</h3>
              </div>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-600">
                {terms.map((term, index) => (
                  <li key={index} className="pl-1">{term}</li>
                ))}
              </ol>
            </div>

            {/* Footer Notice */}
            <div className="mt-10 rounded-2xl border border-dashed border-[#dfe7dc] bg-[#fbfdf9] p-5 text-center text-xs text-slate-500">
              <p className="font-medium text-slate-700">Thank you for booking with Siddhi Farm Resort!</p>
              <p className="mt-1">For any modifications or inquiries, please contact our helpline at <strong>+91 7083682768</strong> or show this invoice at the front desk upon arrival.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
