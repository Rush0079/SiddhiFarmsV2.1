'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, CreditCard, Printer, Share2, X } from 'lucide-react'
import UpiPayment from '@/components/upi-payment'
import BookingTerms from '@/components/booking-terms'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import { executeRecaptcha } from '@/lib/recaptcha-client'
import { LuxuryOverlayLoader } from '@/shared/components/luxury-loader/luxury-loader'
import { SERVICE_KEYS, formatTime12h, calculateHoursDuration } from '@/lib/helpers/formatting'
import { SHORT_STAY_PRESETS, BookingFormDefaults } from './booking-form.model'
import styles from './booking-form.module.css'

const EVENT_SLOTS = [
  ['09:00-22:00', 'Full Day Event (09:00 AM to 10:00 PM)'],
  ['16:00-23:00', 'Evening Reception & Dinner (04:00 PM to 11:00 PM)'],
  ['08:00-15:00', 'Morning & Lunch Celebration (08:00 AM to 03:00 PM)'],
]

export default function BookingPanel({ pricing, user, onClose, flashSale }) {
  // ─── Form State ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    checkIn: '',
    checkOut: '',
    service: 'Master Bedroom',
    guests: '2',
    couponCode: '',
    aadhaarNumber: '',
    termsAccepted: false,
  })
  const [stayType, setStayType] = useState('overnight')
  const [shortStayInTime, setShortStayInTime] = useState('11:00')
  const [shortStayOutTime, setShortStayOutTime] = useState('15:00')
  const [eventSlot, setEventSlot] = useState('09:00-22:00')

  // ─── Booking & Payment State ────────────────────────────────────────────
  const [booking, setBooking] = useState(null)
  const [status, setStatus] = useState('idle') // idle | booking | paying | paid | error
  const [error, setError] = useState('')

  // ─── Coupon & Advance Code State ────────────────────────────────────────
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [appliedAdvance, setAppliedAdvance] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [allCoupons, setAllCoupons] = useState([])

  // ─── Derived Service Category Checks ────────────────────────────────────
  const isEvent = ['Engagement Ceremony', 'Birthday Party', 'Get Together', 'Wedding Ceremony'].includes(form.service)
  const isDayTour = ['One Day Tour', 'Mini Water Park'].includes(form.service)
  const isRoom = ['Master Bedroom', '2 BHK Villa', '4 BHK Villa'].includes(form.service)
  const isSingleDay = isEvent || isDayTour || (isRoom && stayType === 'short_stay')

  // ─── Price Calculation ──────────────────────────────────────────────────
  const nights = form.checkIn && form.checkOut && !isSingleDay
    ? Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
    : 1
  const rate = Number(pricing?.[SERVICE_KEYS[form.service]] || 0)

  let subtotal = 0
  if (isRoom && stayType === 'short_stay') {
    const shortKey = form.service === 'Master Bedroom' ? 'masterBedroomShortStay' : form.service === '2 BHK Villa' ? 'villa2BHKShortStay' : 'villa4BHKShortStay'
    subtotal = pricing?.[shortKey] ? Number(pricing[shortKey]) : Math.round(rate * 0.5)
  } else if (isEvent) {
    subtotal = rate
  } else if (isDayTour) {
    subtotal = rate * Math.max(1, Number(form.guests) || 1)
  } else {
    subtotal = rate * nights
  }

  // ─── Flash Sale / Annual Promotion Discount Calculation ─────────────────
  const isCheckInDuringSale = flashSale && form.checkIn && (() => {
    const start = flashSale.startDateTimeIso ? new Date(flashSale.startDateTimeIso) : null
    const end = flashSale.endDateTimeIso ? new Date(flashSale.endDateTimeIso) : null
    const checkInDate = new Date(form.checkIn)
    if (!start || !end) return false
    return checkInDate >= start && checkInDate <= end
  })()

  const isSaleActiveForBooking = flashSale && (flashSale.isLive !== false || isCheckInDuringSale)

  const isFlashApplicable = isSaleActiveForBooking && (
    flashSale.applicableServices === 'all' ||
    (Array.isArray(flashSale.applicableServices) && flashSale.applicableServices.includes(form.service))
  )
  const flashSaleDiscount = isFlashApplicable && !appliedCoupon
    ? (flashSale.discountType === 'fixed'
        ? Math.min(subtotal, Number(flashSale.discountValue || 0))
        : Math.round(subtotal * Math.min(100, Number(flashSale.discountValue || 0)) / 100))
  : 0

  const activeDiscount = appliedCoupon ? discount : flashSaleDiscount
  const estimate = Math.max(0, Number(subtotal) - Number(activeDiscount || 0))

  // ─── Advance Deposit Calculation ────────────────────────────────────────
  const advanceDeposit = appliedAdvance
    ? (appliedAdvance.percentage ? Math.round(estimate * Math.min(100, appliedAdvance.percentage) / 100) : Math.min(estimate, Number(appliedAdvance.fixedAmount || 0)))
    : null
  const advancePending = advanceDeposit !== null ? Math.max(0, estimate - advanceDeposit) : 0

  // ─── Load Coupons on Mount ──────────────────────────────────────────────
  useEffect(() => {
    async function loadCoupons() {
      try {
        console.log('[UI:BookingPanel:COUPONS] Loading available coupons...')
        const res = await fetch('/api/coupons')
        const coupons = await res.json()
        setAllCoupons(coupons || [])
        console.log('[UI:BookingPanel:COUPONS] Loaded', (coupons || []).length, 'coupons [OK]')
      } catch (err) {
        console.error('[UI:BookingPanel:COUPONS] Failed to load coupons [ERROR]', err.message)
      }
    }
    loadCoupons()
  }, [])

  // ─── Re-validate Coupon on Subtotal Change ──────────────────────────────
  useEffect(() => {
    if (form.couponCode) {
      validateCouponWithSubtotal(form.couponCode, subtotal)
    }
  }, [subtotal, allCoupons])

  async function validateCouponWithSubtotal(code, currentSubtotal) {
    const normalizedCode = (code || '').trim().toUpperCase()
    if (!normalizedCode) {
      setAppliedCoupon(null); setAppliedAdvance(null); setDiscount(0)
      return
    }

    console.log('[UI:BookingPanel:COUPON_VALIDATE] Validating code:', normalizedCode, '| Subtotal:', currentSubtotal)

    const coupon = allCoupons.find(c => c.code.toUpperCase() === normalizedCode && c.active)
    if (coupon) {
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        console.log('[UI:BookingPanel:COUPON_VALIDATE] Coupon expired:', normalizedCode)
        setAppliedCoupon(null); setDiscount(0)
        return
      }

      const subtotalValue = Number(currentSubtotal) || 0
      const minAmount = Number(coupon.min_amount ?? coupon.minimum_amount ?? 0)
      if (subtotalValue < minAmount) {
        console.log('[UI:BookingPanel:COUPON_VALIDATE] Below minimum amount:', minAmount)
        setAppliedCoupon(null); setDiscount(0)
        return
      }

      const discountType = coupon.discount_type || coupon.type || 'percentage'
      const discountValue = Number(coupon.discount_value ?? coupon.value ?? 0)
      const maxDiscount = Number(coupon.max_discount ?? 0)

      let discountAmount = 0
      if (discountType === 'percentage') {
        discountAmount = (subtotalValue * discountValue) / 100
        if (maxDiscount > 0) discountAmount = Math.min(discountAmount, maxDiscount)
      } else {
        discountAmount = discountValue
      }

      const safeDiscount = Number.isFinite(discountAmount) ? Math.max(0, Math.round(discountAmount)) : 0
      setAppliedCoupon(coupon); setAppliedAdvance(null); setDiscount(safeDiscount)
      console.log('[UI:BookingPanel:COUPON_VALIDATE] Coupon applied:', normalizedCode, '| Discount: ₹' + safeDiscount, '[OK]')
      return
    }

    try {
      const advRes = await fetch(`/api/advance-codes/validate?code=${encodeURIComponent(normalizedCode)}`)
      const advData = await advRes.json()
      if (advData.valid) {
        setAppliedAdvance(advData); setAppliedCoupon(null); setDiscount(0)
        console.log('[UI:BookingPanel:COUPON_VALIDATE] Advance code applied:', normalizedCode, '[OK]')
        return
      }
    } catch { /* Fail silently */ }

    setAppliedCoupon(null); setAppliedAdvance(null); setDiscount(0)
  }

  const handleCouponChange = (e) => {
    const code = e.target.value
    setForm(prev => ({ ...prev, couponCode: code }))
    validateCouponWithSubtotal(code, subtotal)
  }

  async function createBooking(event) {
    event.preventDefault()
    setStatus('booking'); setError('')
    console.log('[UI:BookingPanel:CREATE] Submitting booking for', form.service, '| Dates:', form.checkIn, '→', form.checkOut)

    try {
      const inTime = (isRoom && stayType === 'short_stay')
        ? (shortStayInTime || '11:00')
        : isEvent ? eventSlot.split('-')[0] : isDayTour ? '09:30' : '11:00'

      const outTime = (isRoom && stayType === 'short_stay')
        ? (shortStayOutTime || '15:00')
        : isEvent ? eventSlot.split('-')[1] : isDayTour ? '18:00' : '10:00'

      const recaptchaToken = await executeRecaptcha('booking_submit')

      const payload = {
        ...form,
        recaptchaToken,
        checkOut: isSingleDay ? form.checkIn : form.checkOut,
        checkInTime: inTime,
        checkOutTime: outTime,
        isShortStay: isRoom && stayType === 'short_stay',
        stayType: isRoom && stayType === 'short_stay' ? 'short_stay' : (isEvent ? 'event' : (isDayTour ? 'day_tour' : 'overnight')),
      }

      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')

      setBooking(data); setStatus('idle')
      console.log('[UI:BookingPanel:CREATE] Booking created:', data.id, '[OK]')
    } catch (err) {
      setError(err.message); setStatus('error')
      console.error('[UI:BookingPanel:CREATE] Booking failed [ERROR]', err.message)
    }
  }

  async function payNow() {
    setStatus('paying'); setError('')
    console.log('[UI:BookingPanel:PAY] Initiating Razorpay payment for booking:', booking.id)

    try {
      const res = await fetch('/api/razorpay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment setup failed')

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Siddhi Farm Resort',
        description: `Booking ${booking.id} · ${booking.service}`,
        order_id: data.orderId,
        prefill: { name: booking.name, email: booking.email || '', contact: booking.phone },
        theme: { color: '#173d35' },
        handler: async function (response) {
          console.log('[UI:BookingPanel:PAY] Verifying Razorpay signature...')
          const verify = await fetch('/api/razorpay/verify', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingId: booking.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const vData = await verify.json()
          if (verify.ok) {
            setBooking(vData.booking); setStatus('paid')
            console.log('[UI:BookingPanel:PAY] Payment verified successfully [OK]')
          } else {
            setError(vData.error || 'Payment verification failed'); setStatus('error')
            console.error('[UI:BookingPanel:PAY] Verification failed [ERROR]', vData.error)
          }
        },
        modal: { ondismiss: () => { setStatus('idle'); console.log('[UI:BookingPanel:PAY] Payment modal dismissed') } },
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
      console.log('[UI:BookingPanel:PAY] Razorpay modal opened [OK]')
    } catch (err) {
      setError(err.message); setStatus('error')
      console.error('[UI:BookingPanel:PAY] Payment initiation failed [ERROR]', err.message)
    }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#fbfaf6] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl border border-[#dfe7dc]/60">

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#eef2eb] bg-[#fbfaf6] p-6 pb-4 sm:px-9 sm:pt-8 shrink-0">
          <div>
            <p className="eyebrow">{BookingFormDefaults.TITLE}</p>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl text-[#173d35]">{BookingFormDefaults.SUBTITLE}</h2>
          </div>
          <button onClick={onClose} className="rounded-full bg-[#edf1e8] p-2 hover:bg-[#dfe6dc] transition" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:px-9 sm:pb-9">

        {/* ─── State: Payment Confirmed ──────────────────────────────────── */}
        {status === 'paid' ? (
          <div className="rounded-2xl bg-[#e5efe4] p-7 text-center text-[#173d35]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#315d4c] text-white"><Check /></div>
            <h3 className="font-serif text-2xl text-[#173d35]">Payment successful</h3>
            <p className="mt-2 text-sm text-slate-600">Booking <strong>{booking?.id}</strong> is confirmed. A team member will be in touch shortly.</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a href={getWhatsAppShareUrl(booking)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#20bd5a]">
                <Share2 size={16} /> Send to WhatsApp
              </a>
              <a href={`/invoice/${booking?.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#1f4e44]">
                <Printer size={16} /> View PDF Invoice
              </a>
            </div>
            <div className="mt-4"><button className="button-outline text-xs" onClick={onClose}>Close window</button></div>
          </div>

        /* ─── State: Booking Created, Awaiting Payment ──────────────────── */
        ) : booking ? (
          <div className="rounded-2xl border border-[#dfe7dc] bg-white p-6 text-sm text-[#173d35]">
            <p className="eyebrow">Booking created · pending payment</p>
            <p className="mt-2 font-serif text-2xl">₹{Number(booking.amount).toLocaleString('en-IN')}</p>
            <p className="text-xs text-slate-500">Booking ID · {booking.id}</p>
            <div className="mt-4 space-y-1 text-xs text-slate-500">
              <p><strong>{booking.service}</strong> · {booking.nights} night{booking.nights > 1 ? 's' : ''}</p>
              <p>{booking.check_in} → {booking.check_out}</p>
              {booking.applied_coupon && <p>Coupon applied · <strong>{booking.applied_coupon}</strong> · –₹{Number(booking.discount).toLocaleString('en-IN')}</p>}
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button className="button-primary mt-6 w-full" onClick={payNow} disabled={status === 'paying'}>
              <CreditCard size={16} /> {status === 'paying' ? 'Opening payment…' : `Pay ₹${Number(booking.amount).toLocaleString('en-IN')} with Razorpay`}
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-400">Secure UPI · Cards · Netbanking · Wallets via Razorpay</p>
            <UpiPayment booking={booking} />
          </div>

        /* ─── State: Initial Booking Form ────────────────────────────────── */
        ) : (
          <form onSubmit={createBooking} className="grid gap-4 sm:grid-cols-2">
            <input required placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input required placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <label className="sm:col-span-2">Email (for confirmation)<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>

            {/* Service Selector */}
            <label className="sm:col-span-2">
              Stay, Day Tour or Event
              <select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
                {Object.keys(SERVICE_KEYS).map(item => <option key={item}>{item}</option>)}
              </select>
            </label>

            {/* Room Stay Type Toggle */}
            {isRoom && (
              <div className="sm:col-span-2 rounded-2xl border border-[#dfe7dc] bg-white p-3.5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-[#315d4c]">Select Stay Duration</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setStayType('overnight')}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition text-left flex flex-col ${stayType === 'overnight' ? 'bg-[#173d35] text-white shadow' : 'bg-[#f4f7f2] text-[#173d35] hover:bg-[#e7eee4]'}`}>
                    <span>🌙 Full Overnight Stay</span>
                    <span className={`text-[10px] mt-0.5 ${stayType === 'overnight' ? 'text-slate-200' : 'text-slate-500'}`}>11:00 AM → Next day 10:00 AM</span>
                  </button>
                  <button type="button" onClick={() => { setStayType('short_stay'); if (form.checkIn) setForm(prev => ({ ...prev, checkOut: prev.checkIn })) }}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition text-left flex flex-col ${stayType === 'short_stay' ? 'bg-[#315d4c] text-white shadow' : 'bg-[#f4f7f2] text-[#173d35] hover:bg-[#e7eee4]'}`}>
                    <span>☀️ Day Use / Short Stay</span>
                    <span className={`text-[10px] mt-0.5 ${stayType === 'short_stay' ? 'text-emerald-200' : 'text-emerald-700 font-medium'}`}>Flexible Hourly / Day-Use Slots</span>
                  </button>
                </div>

                {stayType === 'short_stay' && (
                  <div className="mt-3 pt-3 border-t border-[#eef2eb] space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-[#315d4c] uppercase tracking-wider mb-1.5">Quick Duration Presets</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {SHORT_STAY_PRESETS.map((preset) => (
                          <button key={preset.hours} type="button"
                            onClick={() => { setShortStayInTime('11:00'); setShortStayOutTime(`${11 + preset.hours}:00`) }}
                            className="rounded-lg py-1.5 px-2 text-[11px] font-medium border border-slate-200 hover:bg-[#edf1e8] transition text-center bg-white text-slate-700">
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Or Choose Custom Start & End Time</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-slate-600 block">Check-in Time<input type="time" required value={shortStayInTime} onChange={e => setShortStayInTime(e.target.value)} className="mt-1 w-full bg-white text-xs" /></label>
                        <label className="text-[11px] text-slate-600 block">Check-out Time<input type="time" required value={shortStayOutTime} onChange={e => setShortStayOutTime(e.target.value)} className="mt-1 w-full bg-white text-xs" /></label>
                      </div>
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-[#edf1e8] px-3 py-1.5 text-xs text-[#173d35]">
                        <span>✨ Your Selected Hours:</span>
                        <strong>{formatTime12h(shortStayInTime)} → {formatTime12h(shortStayOutTime)} ({calculateHoursDuration(shortStayInTime, shortStayOutTime)})</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Event Timing Selector */}
            {isEvent && (
              <div className="sm:col-span-2 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900">🎉 Single-Day Event Celebration</p>
                <p className="text-[11px] text-amber-800 mt-0.5">Package rate includes full lawn/hall amenities for the day.</p>
                <div className="mt-2.5">
                  <label className="text-xs font-medium text-amber-950 block">
                    Event Schedule / Timings
                    <select value={eventSlot} onChange={e => setEventSlot(e.target.value)} className="mt-1 bg-white">
                      {EVENT_SLOTS.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            )}

            {/* Date Pickers */}
            <label className={isSingleDay ? 'sm:col-span-2' : ''}>
              {isEvent ? 'Event Date' : isSingleDay ? 'Visit Date' : 'Check in'}
              <input required type="date" min={new Date().toISOString().slice(0,10)} value={form.checkIn}
                onChange={e => {
                  const val = e.target.value
                  setForm(prev => ({ ...prev, checkIn: val, checkOut: isSingleDay ? val : (prev.checkOut && prev.checkOut > val ? prev.checkOut : val) }))
                }} />
            </label>
            {!isSingleDay && (
              <label>Check out<input required type="date" min={form.checkIn || new Date().toISOString().slice(0,10)} value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} /></label>
            )}

            {/* Guests */}
            <label className="sm:col-span-2">Guests<input required type="number" min="1" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} /></label>

            {/* Coupon / Advance Code */}
            <label className="sm:col-span-2">Coupon or Advance code (optional)
              <input placeholder="MONSOON30 or ADVANCE50" value={form.couponCode} onChange={handleCouponChange}
                className={appliedCoupon ? 'border-green-500 bg-green-50' : appliedAdvance ? 'border-blue-500 bg-blue-50' : ''} />
              {appliedCoupon && <span className="text-xs text-green-600 mt-1 block">✓ Discount coupon applied successfully</span>}
              {appliedAdvance && <span className="text-xs text-blue-700 mt-1 block font-medium">🛡️ Advance code applied: {appliedAdvance.percentage ? `${appliedAdvance.percentage}% deposit` : `₹${appliedAdvance.fixedAmount} deposit`}</span>}
            </label>

            {/* Price Summary */}
            {appliedAdvance ? (
              <div className="flex flex-col gap-1 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm sm:col-span-2 text-blue-950">
                <div className="flex items-center justify-between text-xs text-blue-800"><span>Total stay value · {nights} night{nights > 1 ? 's' : ''}</span><strong className="text-sm text-slate-700">₹{subtotal.toLocaleString('en-IN')}</strong></div>
                <div className="flex items-center justify-between text-xs text-amber-800 mt-1"><span>Pending balance (due upon arrival):</span><strong>₹{advancePending.toLocaleString('en-IN')}</strong></div>
                <div className="flex items-center justify-between text-sm font-bold text-blue-900 mt-2 pt-2 border-t border-blue-200"><span>Due Today (Advance Deposit):</span><strong className="text-lg text-blue-950">₹{advanceDeposit.toLocaleString('en-IN')}</strong></div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-[#edf1e8] p-4 text-sm sm:col-span-2">
                <div>
                  <span>Estimated total · {nights} night{nights > 1 ? 's' : ''}</span>
                  {appliedCoupon && discount > 0 && <span className="block text-xs text-green-600 mt-1 font-semibold">✓ Promo discount: −₹{discount.toLocaleString('en-IN')}</span>}
                  {!appliedCoupon && flashSaleDiscount > 0 && <span className="block text-xs text-amber-800 font-bold mt-1">{flashSale?.badgeText || '⚡ Flash Sale'}: −₹{flashSaleDiscount.toLocaleString('en-IN')} ({flashSale?.discountType === 'percentage' ? `${flashSale?.discountValue}% OFF` : `₹${flashSale?.discountValue} OFF`})</span>}
                </div>
                <div className="text-right">
                  {activeDiscount > 0 && <p className="line-through text-slate-500 text-sm">₹{subtotal.toLocaleString('en-IN')}</p>}
                  <strong className="text-lg text-[#173d35]">₹{estimate.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            )}

            {/* Aadhaar */}
            <label className="sm:col-span-2">Aadhaar Number (12 digits)
              <input required type="text" inputMode="numeric" placeholder="12-digit Aadhaar Number (e.g. 1234 5678 9012)" value={form.aadhaarNumber} maxLength="14"
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                  const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
                  setForm({ ...form, aadhaarNumber: formatted })
                }} />
            </label>

            {/* Terms & Conditions */}
            <div className="sm:col-span-2"><BookingTerms checked={form.termsAccepted} onChange={termsAccepted => setForm({ ...form, termsAccepted })} /></div>

            {/* Error Message */}
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

            {/* Submit Button */}
            <button className="button-primary sm:col-span-2" type="submit" disabled={status === 'booking'}>
              {status === 'booking' ? 'Checking availability…' : <>Continue to payment <ArrowUpRight size={17} /></>}
            </button>
          </form>
        )}
        </div>
      </div>

      {/* ─── Loading Overlays ────────────────────────────────────────────── */}
      {status === 'booking' && (
        <LuxuryOverlayLoader title="Securing Your Reservation" subtitle="Verifying suite availability & preparing terms..." progressMessage="Reserving dates and computing booking deposit" />
      )}
      {status === 'paying' && (
        <LuxuryOverlayLoader title="Preparing Secure Checkout" subtitle="Connecting to encrypted payment gateway..." progressMessage="Generating cryptographic Razorpay order ID" />
      )}
    </div>
  )
}
