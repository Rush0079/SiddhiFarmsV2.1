'use client'

export const dynamic = 'force-dynamic'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { ArrowLeft, Check, CreditCard, Loader2, MapPin, Phone, ShieldCheck, Sparkles, Clock, AlertCircle, Printer, Share2 } from 'lucide-react'
import UpiPayment from '@/components/upi-payment'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'

export default function BalancePaymentPage({ params }) {
  const { id } = use(params)
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('idle') // idle | paying | paid | error

  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true)
        const res = await fetch(`/api/bookings/public/${encodeURIComponent(id)}`)
        if (!res.ok) {
          const d = await res.json().catch(() => ({}))
          throw new Error(d.error || 'Booking not found')
        }
        const data = await res.json()
        setBooking(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (id) loadBooking()
  }, [id])

  async function payBalance() {
    setStatus('paying')
    setError('')
    try {
      const res = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: booking.id, type: 'balance' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment setup failed')

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Siddhi Farm Resort',
        description: `Balance Settlement · Booking ${booking.id}`,
        order_id: data.orderId,
        prefill: { name: booking.name, email: booking.email || '', contact: booking.phone },
        theme: { color: '#173d35' },
        handler: async function (response) {
          const verify = await fetch('/api/razorpay/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: booking.id,
              type: 'balance',
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const vData = await verify.json()
          if (verify.ok) {
            setBooking(vData.booking)
            setStatus('paid')
          } else {
            setError(vData.error || 'Payment verification failed')
            setStatus('error')
          }
        },
        modal: { ondismiss: () => setStatus('idle') },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5ef] text-[#173d35]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#315d4c]" size={32} />
          <p className="text-sm font-medium text-slate-600">Loading booking invoice…</p>
        </div>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f5ef] p-4 text-[#173d35]">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={28} />
          </div>
          <h1 className="font-serif text-2xl text-[#173d35]">Booking Not Found</h1>
          <p className="mt-2 text-sm text-slate-600">We could not find booking <strong>{id}</strong>. Please check your link or contact the resort team.</p>
          <Link href="/" className="button-primary mt-6 inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Return to Home
          </Link>
        </div>
      </div>
    )
  }

  const isPending = Number(booking.pending_amount || 0) > 0 && status !== 'paid'
  const balanceToPay = Number(booking.pending_amount || 0)

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <main className="min-h-screen bg-[#f3f5ef] pb-16 pt-8 text-[#173d35]">
        <div className="container max-w-2xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#315d4c] hover:underline">
              <ArrowLeft size={16} /> Siddhi Farm Resort
            </Link>
            <span className="flex items-center gap-1.5 rounded-full bg-[#e3eee1] px-3 py-1 text-xs font-semibold text-[#315d4c]">
              <ShieldCheck size={14} /> Secure Payment
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#dfe7dc] bg-white shadow-xl">
            {/* Header banner */}
            <div className="bg-[#173d35] p-6 text-white sm:p-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-[#d5b36a]">
                    {isPending ? 'Advance Booking Confirmed' : 'Booking Fully Paid'}
                  </p>
                  <h1 className="mt-1 font-serif text-2xl sm:text-3xl">Balance Settlement</h1>
                  <p className="mt-1 text-xs text-white/70">Booking ID · {booking.id}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${isPending ? 'bg-amber-400 text-amber-950' : 'bg-green-400 text-green-950'}`}>
                  {isPending ? 'Balance Due' : 'Paid in Full ✓'}
                </span>
              </div>
            </div>

            {/* Content area */}
            <div className="p-6 sm:p-8">
              {status === 'paid' || (!isPending && booking.paid) ? (
                <div className="rounded-2xl bg-[#e5efe4] p-6 text-center text-[#173d35]">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#315d4c] text-white">
                    <Check size={24} />
                  </div>
                  <h2 className="font-serif text-2xl text-[#173d35]">Payment Complete</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Your remaining balance has been cleared successfully. Booking <strong>{booking.id}</strong> is 100% paid and confirmed.
                  </p>
                  
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={getWhatsAppShareUrl(booking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#20bd5a]"
                    >
                      <Share2 size={16} /> Send to WhatsApp
                    </a>
                    <Link
                      href={`/invoice/${booking.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#1f4e44]"
                    >
                      <Printer size={16} /> View PDF Invoice
                    </Link>
                  </div>

                  <div className="mt-4">
                    <Link href="/" className="text-xs font-medium text-[#315d4c] hover:underline">
                      ← Return to Siddhi Farm Resort
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Financial Breakdown Card */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-900">Payment Breakdown</p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Total Stay Value</span>
                        <span className="font-medium text-slate-900">₹{Number(booking.total_amount || booking.amount).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-green-800">
                        <span className="flex items-center gap-1"><Check size={14} /> Advance Paid</span>
                        <span className="font-semibold text-green-900">−₹{Number(booking.paid_amount || (booking.paid ? booking.amount : 0)).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex items-between justify-between border-t border-amber-200 pt-3 text-base font-bold text-[#173d35]">
                        <span>Remaining Balance Due</span>
                        <span className="text-2xl text-[#173d35]">₹{balanceToPay.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reservation Overview */}
                  <div className="mt-6 rounded-2xl border border-[#dfe7dc] bg-[#f9faf6] p-5">
                    <h3 className="font-semibold text-sm text-[#173d35] mb-3">Reservation Details</h3>
                    <div className="grid gap-2 text-xs sm:grid-cols-2 text-slate-600">
                      <div><strong className="text-slate-900">Guest:</strong> {booking.name}</div>
                      <div><strong className="text-slate-900">Phone:</strong> {booking.phone}</div>
                      <div><strong className="text-slate-900">Service:</strong> {booking.service}</div>
                      <div><strong className="text-slate-900">Guests:</strong> {booking.guests} guest{Number(booking.guests) > 1 ? 's' : ''}</div>
                      <div className="sm:col-span-2">
                        <strong className="text-slate-900">Stay Dates:</strong> {booking.check_in} → {booking.check_out} ({booking.nights} night{booking.nights > 1 ? 's' : ''})
                      </div>
                    </div>
                  </div>

                  {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}

                  {/* Payment Button */}
                  <div className="mt-6 space-y-3">
                    <button
                      className="button-primary w-full py-3.5 text-base font-bold shadow-lg"
                      onClick={payBalance}
                      disabled={status === 'paying'}
                    >
                      <CreditCard size={18} />
                      {status === 'paying' ? 'Opening Payment…' : `Pay ₹${balanceToPay.toLocaleString('en-IN')} Balance with Razorpay`}
                    </button>
                    <p className="text-center text-[11px] text-slate-400">
                      Instant verification · UPI, Google Pay, PhonePe, Cards, Netbanking
                    </p>

                    {/* UPI Fallback */}
                    <div className="pt-2">
                      <UpiPayment booking={{ id: booking.id, amount: balanceToPay }} />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer help */}
            <div className="border-t border-[#dfe7dc] bg-[#f3f5ef] p-6 text-xs text-slate-600">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-[#315d4c]" />
                  <span>Resort Owner: <strong>7083682768</strong></span>
                </div>
                <a href="https://maps.app.goo.gl/iBiKXi45sJ99vrV69" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 font-semibold text-[#315d4c] hover:underline">
                  <MapPin size={14} /> Open in Google Maps →
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
