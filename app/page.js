'use client'

import { useEffect, useMemo, useState } from 'react'
import Script from 'next/script'
import { ArrowUpRight, CalendarDays, Check, ChevronDown, CreditCard, Instagram, LogOut, MapPin, Menu, Phone, Sparkles, Star, User, Waves, X, Printer, Share2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { siteImage } from '@/lib/siteImages'
import UpiPayment from '@/components/upi-payment'
import BookingTerms from '@/components/booking-terms'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import { executeRecaptcha } from '@/lib/recaptcha-client'
import SiddhiLogo from '@/components/siddhi-logo'

const experiences = [
  ['farm-stays', 'Farm stays', 'Wake up to birdsong in our spacious master bedrooms and private villas.', 'masterBedroom', 'per night'],
  ['one-day-tour', 'One Day Tour', 'A relaxed countryside day with lunch and open-lawn play. No overnight required.', 'oneDayTour', 'per person'],
  ['mini-water-park', 'Mini Water Park', 'Splash-worthy fun with slides, kid zones and shaded seating for parents.', 'miniWaterPark', 'per person'],
  ['get-together', 'Get-Togethers', 'Spacious open lawns and shaded banquet areas perfect for family reunions and alumni gatherings.', 'getTogetherEvent', 'per event'],
  ['birthday-party', 'Birthday & Naming Ceremony', 'Joyful celebration setups with music, dining, and scenic poolside backdrops.', 'birthdayEvent', 'per event'],
  ['wedding-ceremony', 'Wedding & Engagement', 'Breathtaking countryside open-air ceremonies, mandap lawns and memorable celebrations.', 'weddingEvent', 'per event'],
]
const stayCards = [
  ['master-bedroom', '01', 'Master bedrooms', 'A calm, comfortable base for slow mornings.', 'masterBedroom', 'stayMasterBedroom'],
  ['2-bhk-villa', '02', '2 BHK Villa', 'Your own spacious hideaway for family time.', 'villa2BHK', 'stayVilla2BHK'],
  ['4-bhk-villa', '03', '4 BHK Villa', 'Room to bring everyone you love.', 'villa4BHK', 'stayVilla4BHK'],
]
const serviceKeys = { 'Master Bedroom': 'masterBedroom', '2 BHK Villa': 'villa2BHK', '4 BHK Villa': 'villa4BHK', 'One Day Tour': 'oneDayTour', 'Mini Water Park': 'miniWaterPark', 'Wedding Ceremony': 'weddingEvent', 'Engagement Ceremony': 'engagementEvent', 'Birthday Party': 'birthdayEvent', 'Get Together': 'getTogetherEvent' }

function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const [h, m] = String(timeStr).split(':').map(Number)
  if (isNaN(h)) return timeStr
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m || 0).padStart(2, '0')} ${suffix}`
}

function calculateHoursDuration(inStr, outStr) {
  const [inH, inM] = (inStr || '11:00').split(':').map(Number)
  const [outH, outM] = (outStr || '15:00').split(':').map(Number)
  const diffMinutes = (outH * 60 + outM) - (inH * 60 + inM)
  if (diffMinutes <= 0) return 'Custom'
  const hours = diffMinutes / 60
  return Number.isInteger(hours) ? `${hours} Hours` : `${hours.toFixed(1)} Hours`
}

function BookingPanel({ pricing, user, onClose }) {
  const [form, setForm] = useState({ name: user?.user_metadata?.full_name || '', email: user?.email || '', phone: user?.user_metadata?.phone || '', checkIn: '', checkOut: '', service: 'Master Bedroom', guests: '2', couponCode: '', aadhaarNumber: '', termsAccepted: false })
  const [stayType, setStayType] = useState('overnight') // 'overnight' | 'short_stay'
  const [shortStayInTime, setShortStayInTime] = useState('11:00')
  const [shortStayOutTime, setShortStayOutTime] = useState('15:00')
  const [eventSlot, setEventSlot] = useState('09:00-22:00')
  const [booking, setBooking] = useState(null)
  const [status, setStatus] = useState('idle') // idle | booking | paying | paid | error
  const [error, setError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [appliedAdvance, setAppliedAdvance] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [allCoupons, setAllCoupons] = useState([])

  const isEvent = ['Engagement Ceremony', 'Birthday Party', 'Get Together', 'Wedding Ceremony'].includes(form.service)
  const isDayTour = ['One Day Tour', 'Mini Water Park'].includes(form.service)
  const isRoom = ['Master Bedroom', '2 BHK Villa', '4 BHK Villa'].includes(form.service)
  const isSingleDay = isEvent || isDayTour || (isRoom && stayType === 'short_stay')

  const nights = form.checkIn && form.checkOut && !isSingleDay
    ? Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
    : 1
  const rate = Number(pricing[serviceKeys[form.service]] || 0)
  
  let subtotal = 0
  if (isRoom && stayType === 'short_stay') {
    const shortKey = form.service === 'Master Bedroom' ? 'masterBedroomShortStay' : form.service === '2 BHK Villa' ? 'villa2BHKShortStay' : 'villa4BHKShortStay'
    subtotal = pricing[shortKey] ? Number(pricing[shortKey]) : Math.round(rate * 0.5)
  } else if (isEvent) {
    subtotal = rate
  } else if (isDayTour) {
    subtotal = rate * Math.max(1, Number(form.guests) || 1)
  } else {
    subtotal = rate * nights
  }
  
  const estimate = Math.max(0, Number(subtotal) - Number(discount || 0))

  const advanceDeposit = appliedAdvance
    ? (appliedAdvance.percentage ? Math.round(estimate * Math.min(100, appliedAdvance.percentage) / 100) : Math.min(estimate, Number(appliedAdvance.fixedAmount || 0)))
    : null
  const advancePending = advanceDeposit !== null ? Math.max(0, estimate - advanceDeposit) : 0

  // Load all coupons once
  useEffect(() => {
    async function loadCoupons() {
      try {
        const res = await fetch('/api/coupons')
        const coupons = await res.json()
        setAllCoupons(coupons || [])
      } catch (err) {
        console.error('Error loading coupons:', err)
      }
    }
    loadCoupons()
  }, [])

  // Re-validate coupon whenever subtotal changes (dates or guests change)
  useEffect(() => {
    if (form.couponCode) {
      validateCouponWithSubtotal(form.couponCode, subtotal)
    }
  }, [subtotal, allCoupons])

  // Real-time coupon/advance code validation with explicit subtotal parameter
  async function validateCouponWithSubtotal(code, currentSubtotal) {
    const normalizedCode = (code || '').trim().toUpperCase()
    if (!normalizedCode) {
      setAppliedCoupon(null)
      setAppliedAdvance(null)
      setDiscount(0)
      return
    }

    const coupon = allCoupons.find(c => c.code.toUpperCase() === normalizedCode && c.active)
    
    if (coupon) {
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        setAppliedCoupon(null)
        setDiscount(0)
        return
      }

      const subtotalValue = Number(currentSubtotal) || 0
      const minAmount = Number(coupon.min_amount ?? coupon.minimum_amount ?? 0)
      if (subtotalValue < minAmount) {
        setAppliedCoupon(null)
        setDiscount(0)
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
      setAppliedCoupon(coupon)
      setAppliedAdvance(null)
      setDiscount(safeDiscount)
      return
    }

    // Check if matching an Advance Code
    try {
      const advRes = await fetch(`/api/advance-codes/validate?code=${encodeURIComponent(normalizedCode)}`)
      const advData = await advRes.json()
      if (advData.valid) {
        setAppliedAdvance(advData)
        setAppliedCoupon(null)
        setDiscount(0)
        return
      }
    } catch {}

    setAppliedCoupon(null)
    setAppliedAdvance(null)
    setDiscount(0)
  }

  // Handle coupon/advance code change
  const handleCouponChange = (e) => {
    const code = e.target.value
    setForm(prev => ({ ...prev, couponCode: code }))
    validateCouponWithSubtotal(code, subtotal)
  }

  async function createBooking(event) {
    event.preventDefault()
    setStatus('booking'); setError('')
    try {
      const inTime = (isRoom && stayType === 'short_stay')
        ? (shortStayInTime || '11:00')
        : isEvent
        ? eventSlot.split('-')[0]
        : isDayTour
        ? '09:30'
        : '11:00'

      const outTime = (isRoom && stayType === 'short_stay')
        ? (shortStayOutTime || '15:00')
        : isEvent
        ? eventSlot.split('-')[1]
        : isDayTour
        ? '18:00'
        : '10:00'

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
    } catch (err) {
      setError(err.message); setStatus('error')
    }
  }

  async function payNow() {
    setStatus('paying'); setError('')
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
          if (verify.ok) { setBooking(vData.booking); setStatus('paid') }
          else { setError(vData.error || 'Payment verification failed'); setStatus('error') }
        },
        modal: { ondismiss: () => setStatus('idle') },
      }
      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      setError(err.message); setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#fbfaf6] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl border border-[#dfe7dc]/60">
        <div className="flex items-start justify-between border-b border-[#eef2eb] bg-[#fbfaf6] p-6 pb-4 sm:px-9 sm:pt-8 shrink-0">
          <div><p className="eyebrow">Reserve your stay</p><h2 className="mt-1 font-serif text-2xl sm:text-3xl text-[#173d35]">Make it a Siddhi day</h2></div>
          <button onClick={onClose} className="rounded-full bg-[#edf1e8] p-2 hover:bg-[#dfe6dc] transition" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:px-9 sm:pb-9">
        {status === 'paid' ? (
          <div className="rounded-2xl bg-[#e5efe4] p-7 text-center text-[#173d35]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#315d4c] text-white"><Check /></div>
            <h3 className="font-serif text-2xl text-[#173d35]">Payment successful</h3>
            <p className="mt-2 text-sm text-slate-600">Booking <strong>{booking.id}</strong> is confirmed. A team member will be in touch shortly.</p>
            
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a
                href={getWhatsAppShareUrl(booking)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#20bd5a]"
              >
                <Share2 size={16} /> Send to WhatsApp
              </a>
              <a
                href={`/invoice/${booking.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-[#173d35] px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-[#1f4e44]"
              >
                <Printer size={16} /> View PDF Invoice
              </a>
            </div>

            <div className="mt-4">
              <button className="button-outline text-xs" onClick={onClose}>Close window</button>
            </div>
          </div>
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
        ) : (
          <form onSubmit={createBooking} className="grid gap-4 sm:grid-cols-2">
            <input required placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input required placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <label className="sm:col-span-2">Email (for confirmation)<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            
            <label className="sm:col-span-2">
              Stay, Day Tour or Event
              <select value={form.service} onChange={e => {
                const s = e.target.value
                setForm({ ...form, service: s })
              }}>
                {Object.keys(serviceKeys).map(item => <option key={item}>{item}</option>)}
              </select>
            </label>

            {/* Room Stay Options: Overnight vs 4-5 Hours Day Use */}
            {isRoom && (
              <div className="sm:col-span-2 rounded-2xl border border-[#dfe7dc] bg-white p-3.5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-[#315d4c]">Select Stay Duration</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStayType('overnight')}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition text-left flex flex-col ${
                      stayType === 'overnight'
                        ? 'bg-[#173d35] text-white shadow'
                        : 'bg-[#f4f7f2] text-[#173d35] hover:bg-[#e7eee4]'
                    }`}
                  >
                    <span>🌙 Full Overnight Stay</span>
                    <span className={`text-[10px] mt-0.5 ${stayType === 'overnight' ? 'text-slate-200' : 'text-slate-500'}`}>11:00 AM → Next day 10:00 AM</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStayType('short_stay')
                      if (form.checkIn) setForm(prev => ({ ...prev, checkOut: prev.checkIn }))
                    }}
                    className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition text-left flex flex-col ${
                      stayType === 'short_stay'
                        ? 'bg-[#315d4c] text-white shadow'
                        : 'bg-[#f4f7f2] text-[#173d35] hover:bg-[#e7eee4]'
                    }`}
                  >
                    <span>☀️ Day Use / Short Stay</span>
                    <span className={`text-[10px] mt-0.5 ${stayType === 'short_stay' ? 'text-emerald-200' : 'text-emerald-700 font-medium'}`}>Flexible Hourly / Day-Use Slots</span>
                  </button>
                </div>

                {stayType === 'short_stay' && (
                  <div className="mt-3 pt-3 border-t border-[#eef2eb] space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-[#315d4c] uppercase tracking-wider mb-1.5">Quick Duration Presets</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          ['2 Hours (11 AM - 1 PM)', '11:00', '13:00'],
                          ['3 Hours (12 PM - 3 PM)', '12:00', '15:00'],
                          ['4 Hours (12 PM - 4 PM)', '12:00', '16:00'],
                          ['5 Hours (10 AM - 3 PM)', '10:00', '15:00'],
                        ].map(([label, inT, outT]) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              setShortStayInTime(inT)
                              setShortStayOutTime(outT)
                            }}
                            className={`rounded-lg py-1.5 px-2 text-[11px] font-medium border transition text-center ${
                              shortStayInTime === inT && shortStayOutTime === outT
                                ? 'bg-[#173d35] text-white border-[#173d35] shadow-xs font-bold'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-[#edf1e8]'
                            }`}
                          >
                            {label.split(' (')[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Or Choose Custom Start & End Time</p>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="text-[11px] text-slate-600 block">
                          Check-in Time
                          <input
                            type="time"
                            required
                            value={shortStayInTime}
                            onChange={e => setShortStayInTime(e.target.value)}
                            className="mt-1 w-full bg-white text-xs"
                          />
                        </label>
                        <label className="text-[11px] text-slate-600 block">
                          Check-out Time
                          <input
                            type="time"
                            required
                            value={shortStayOutTime}
                            onChange={e => setShortStayOutTime(e.target.value)}
                            className="mt-1 w-full bg-white text-xs"
                          />
                        </label>
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
                      <option value="09:00-22:00">Full Day Event (09:00 AM to 10:00 PM)</option>
                      <option value="16:00-23:00">Evening Reception & Dinner (04:00 PM to 11:00 PM)</option>
                      <option value="08:00-15:00">Morning & Lunch Celebration (08:00 AM to 03:00 PM)</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            <label className={isSingleDay ? 'sm:col-span-2' : ''}>
              {isEvent ? 'Event Date' : isSingleDay ? 'Visit Date' : 'Check in'}
              <input
                required
                type="date"
                min={new Date().toISOString().slice(0,10)}
                value={form.checkIn}
                onChange={e => {
                  const val = e.target.value
                  setForm(prev => ({
                    ...prev,
                    checkIn: val,
                    checkOut: isSingleDay ? val : (prev.checkOut && prev.checkOut > val ? prev.checkOut : val)
                  }))
                }}
              />
            </label>

            {!isSingleDay && (
              <label>
                Check out
                <input
                  required
                  type="date"
                  min={form.checkIn || new Date().toISOString().slice(0,10)}
                  value={form.checkOut}
                  onChange={e => setForm({ ...form, checkOut: e.target.value })}
                />
              </label>
            )}

            <label className="sm:col-span-2">
              Guests
              <input required type="number" min="1" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} />
            </label>
            <label className="sm:col-span-2">Coupon or Advance code (optional)
              <input 
                placeholder="MONSOON30 or ADVANCE50" 
                value={form.couponCode} 
                onChange={handleCouponChange}
                className={appliedCoupon ? 'border-green-500 bg-green-50' : appliedAdvance ? 'border-blue-500 bg-blue-50' : ''}
              />
              {appliedCoupon && <span className="text-xs text-green-600 mt-1 block">✓ Discount coupon applied successfully</span>}
              {appliedAdvance && <span className="text-xs text-blue-700 mt-1 block font-medium">🛡️ Advance code applied: {appliedAdvance.percentage ? `${appliedAdvance.percentage}% deposit` : `₹${appliedAdvance.fixedAmount} deposit`}</span>}
            </label>
            {appliedAdvance ? (
              <div className="flex flex-col gap-1 rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm sm:col-span-2 text-blue-950">
                <div className="flex items-center justify-between text-xs text-blue-800">
                  <span>Total stay value · {nights} night{nights > 1 ? 's' : ''}</span>
                  <strong className="text-sm text-slate-700">₹{subtotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex items-center justify-between text-xs text-amber-800 mt-1">
                  <span>Pending balance (due upon arrival):</span>
                  <strong>₹{advancePending.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex items-center justify-between text-sm font-bold text-blue-900 mt-2 pt-2 border-t border-blue-200">
                  <span>Due Today (Advance Deposit):</span>
                  <strong className="text-lg text-blue-950">₹{advanceDeposit.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-[#edf1e8] p-4 text-sm sm:col-span-2">
                <div>
                  <span>Estimated total · {nights} night{nights > 1 ? 's' : ''}</span>
                  {discount > 0 && <span className="block text-xs text-green-600 mt-1">Discount applied: ₹{discount.toLocaleString('en-IN')}</span>}
                </div>
                <div className="text-right">
                  {discount > 0 && <p className="line-through text-slate-500 text-sm">₹{subtotal.toLocaleString('en-IN')}</p>}
                  <strong className="text-lg text-[#173d35]">₹{estimate.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            )}
            <label className="sm:col-span-2">
              Aadhaar Number (12 digits)
              <input
                required
                type="text"
                inputMode="numeric"
                placeholder="12-digit Aadhaar Number (e.g. 1234 5678 9012)"
                value={form.aadhaarNumber}
                maxLength="14"
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 12)
                  const formatted = digits.replace(/(\d{4})(?=\d)/g, '$1 ')
                  setForm({ ...form, aadhaarNumber: formatted })
                }}
              />
            </label>
            <div className="sm:col-span-2"><BookingTerms checked={form.termsAccepted} onChange={termsAccepted => setForm({ ...form, termsAccepted })} /></div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button className="button-primary sm:col-span-2" type="submit" disabled={status === 'booking'}>
              {status === 'booking' ? 'Checking availability…' : <>Continue to payment <ArrowUpRight size={17} /></>}
            </button>
          </form>
        )}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [pricing, setPricing] = useState({ masterBedroom: 4500, villa2BHK: 9000, villa4BHK: 15000, oneDayTour: 700, miniWaterPark: 950, weddingEvent: 35000, engagementEvent: 18000, birthdayEvent: 12000, getTogetherEvent: 10000 })
  const [images, setImages] = useState({})
  const [bookingOpen, setBookingOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  useEffect(() => {
    fetch('/api/pricing').then(r => r.json()).then(setPricing).catch(() => {})
    fetch('/api/images').then(r => r.json()).then(setImages).catch(() => {})
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (!session?.user) setProfile(null)
    })
    return () => sub?.subscription?.unsubscribe?.()
  }, [supabase])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null)
  }

  const stats = useMemo(() => [['03', 'Master bedrooms'], ['02', 'Private villas'], ['01', 'Beautiful farm'], ['∞', 'Ways to unwind']], [])
  const isStaff = profile && ['staff', 'manager', 'super_admin'].includes(profile.role)
  const img = key => siteImage(images, key)

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <main>
        <nav className="absolute left-0 right-0 top-0 z-20">
          <div className="container flex h-24 items-center justify-between">
            <a href="#top" className="group block transition hover:opacity-90">
              <SiddhiLogo variant="nav" />
            </a>
            <div className="hidden items-center gap-8 text-sm text-white/85 md:flex">
              <a href="#stay">Stay</a><a href="#experiences">Experiences</a><a href="#story">Our story</a><a href="#contact">Contact</a>
              {isStaff && <a href="/admin">Admin</a>}
            </div>
            <div className="hidden items-center gap-3 md:flex">
              {user ? (
                <>
                  <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white"><User size={13} /> {profile?.full_name || user.email}</span>
                  <button onClick={signOut} className="rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"><LogOut size={13} className="mr-1 inline" /> Sign out</button>
                </>
              ) : (
                <a href="/login" className="rounded-full border border-white/25 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">Sign in</a>
              )}
              <button className="button-light shimmer-button" onClick={() => setBookingOpen(true)}>Plan your visit <ArrowUpRight size={16} /></button>
            </div>
            <button className="rounded-full border border-white/30 p-2 text-white md:hidden" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
          {menuOpen && (
            <div className="mx-4 rounded-2xl bg-[#173d35] p-5 text-white md:hidden">
              <div className="grid gap-4 text-sm">
                <a href="#stay">Stay</a>
                <a href="#experiences">Experiences</a>
                <a href="#story">Our story</a>
                {isStaff ? <a href="/admin">Admin dashboard</a> : null}
                {user ? <button onClick={signOut} className="text-left">Sign out</button> : <a href="/login">Sign in / Sign up</a>}
                <button onClick={() => setBookingOpen(true)} className="text-left">Plan your visit ↗</button>
              </div>
            </div>
          )}
        </nav>

        {/* Area 1: Hero Section with Ambient Motion Graphics */}
        <section id="top" className="hero flex min-h-[720px] items-end relative overflow-hidden" style={{ backgroundImage: `linear-gradient(90deg, rgba(12,42,34,.92) 0%, rgba(18,57,46,.62) 48%, rgba(16,47,39,.2) 100%), url(${img('homeHero')})` }}>
          {/* Ambient Rotating Sunburst Aura */}
          <div className="pointer-events-none absolute -left-32 top-10 h-[500px] w-[500px] rounded-full bg-radial from-[#e5a93c]/20 via-[#315d4c]/10 to-transparent blur-3xl animate-sunburst-spin opacity-70" />
          <div className="pointer-events-none absolute right-10 top-20 h-[400px] w-[400px] rounded-full bg-radial from-[#74c69d]/15 via-transparent to-transparent blur-2xl animate-ambient-orb" />

          <div className="container relative z-10 pb-20 pt-36">
            <div className="max-w-3xl">
              <p className="eyebrow flex items-center gap-2.5 text-[#e3c77c]">
                <Sparkles size={16} className="text-[#f6bd50] animate-sparkle-drift shrink-0" />
                <span>Farm stays · Agro tourism · Celebrations</span>
              </p>

              <h1 className="mt-5 font-serif text-6xl leading-[.95] tracking-tight text-white sm:text-8xl">
                Come for the <em className="font-normal text-[#e3c77c]">green.</em><br />Stay for the feeling.
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/75">
                A quiet corner of the countryside where good food, open skies and unhurried time come together.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button className="button-light shimmer-button shadow-xl text-sm px-7 py-3.5 font-bold" onClick={() => setBookingOpen(true)}>
                  Plan your visit <ArrowUpRight size={18} />
                </button>
                <a className="button-ghost shimmer-button text-sm px-7 py-3.5" href="#story">
                  Discover Siddhi <ArrowUpRight size={18} />
                </a>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 hidden items-center gap-3 text-xs text-white/60 lg:flex"><span className="h-px w-12 bg-white/40" /> Maharashtra, India</div>
        </section>

        {/* Area 2: Interactive Live Stats Section */}
        <section className="border-b border-[#dfe6dc] bg-[#f4f5ef]">
          <div className="container grid grid-cols-2 divide-x divide-[#dfe6dc] sm:grid-cols-4">
            {stats.map(([n, label]) => (
              <div key={label} className="group px-4 py-8 text-center first:pl-0 sm:py-10 transition-all duration-300 hover:bg-white/60">
                <p className="font-serif text-3xl sm:text-4xl font-bold text-[#315d4c] transition-transform duration-300 group-hover:scale-110 group-hover:text-[#214b40]">{n}</p>
                <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[.18em] text-slate-500 group-hover:text-[#b77c4e] transition-colors">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Area 3: Story & Interactive Feature Highlights */}
        <section id="story" className="container grid gap-14 py-24 sm:py-32 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#e3eee1] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#315d4c] mb-3">
              <span className="h-2 w-2 rounded-full bg-[#315d4c] animate-ping" />
              The Siddhi feeling
            </div>
            <h2 className="section-title">A little closer<br /><em>to what matters.</em></h2>
          </div>
          <div>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              At Siddhi Farm Resort, the days are shaped by nature. Wander through our farm, dip into the pool, share a long meal, or simply find a shady spot and do absolutely nothing.
            </p>
            <div className="mt-8 grid gap-3.5 text-sm text-[#315d4c] sm:grid-cols-2">
              {[
                'Farm-fresh organic dining',
                'Spacious private luxury villas',
                'Exclusive celebration lawns',
                'Warm authentic hospitality'
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-3 rounded-2xl bg-white border border-[#e1e7dd] p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#315d4c]/40 hover:shadow-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#e3eee1] text-[#315d4c] font-bold">
                    ✓
                  </div>
                  <span className="font-semibold text-[#173d35]">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="experiences" className="bg-[#173d35] py-24 text-white sm:py-32">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div><p className="eyebrow text-[#d5b36a]">Choose your pace</p><h2 className="section-title text-white">There is always<br /><em>more to experience.</em></h2></div>
              <Sparkles className="block text-[#d5b36a] animate-spin-round cursor-pointer hover:opacity-80 transition-opacity h-8 w-8 sm:h-11 sm:w-11" strokeWidth={1.2} style={{ filter: 'drop-shadow(0 0 10px rgba(213, 179, 106, 0.45))' }} />
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/15 md:grid-cols-3">
              {experiences.map(([slug, title, desc, priceKey, unit], i) => {
                const rate = pricing[priceKey] || 0
                return (
                  <a href={`/details/${slug}`} key={slug} className="luxury-card group block bg-[#214b40] p-8 transition-all duration-300 hover:bg-[#28574a] sm:p-10">
                    <span className="text-sm font-bold text-[#d5b36a]">0{i + 1}</span>
                    <h3 className="mt-20 font-serif text-3xl transition-transform duration-300 group-hover:translate-x-1">{title}</h3>
                    <p className="mt-4 min-h-14 text-sm leading-6 text-white/65">{desc}</p>
                    <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-5 text-sm">
                      <span className="font-medium text-[#e3c77c]">₹{rate.toLocaleString('en-IN')} <span className="text-white/50 text-xs">/ {unit.replace('per ', '')}</span></span>
                      <ArrowUpRight className="transition group-hover:translate-x-1 group-hover:-translate-y-1 text-[#d5b36a]" size={18} />
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        </section>

        <section id="stay" className="container py-24 sm:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div><p className="eyebrow">Stay awhile</p><h2 className="section-title">Your room in<br /><em>the countryside.</em></h2></div>
            <button className="button-outline shimmer-button" onClick={() => setBookingOpen(true)}>View availability <ArrowUpRight size={16} /></button>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {stayCards.map(([slug, no, title, desc, priceKey, imageKey]) => (
              <a href={`/details/${slug}`} className="stay-card luxury-card group block transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl" key={slug}>
                <div className="stay-image overflow-hidden" style={{ backgroundImage: `linear-gradient(0deg, rgba(18,57,46,.28), transparent), url(${img(imageKey)})` }}>
                  <span className="shadow-md transition-transform duration-300 group-hover:scale-110">{no}</span>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-center"><h3 className="font-serif text-2xl text-[#173d35] group-hover:text-[#315d4c] transition-colors">{title}</h3><span className="text-sm font-semibold text-[#315d4c]">₹{(pricing[priceKey] || 0).toLocaleString('en-IN')}+</span></div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{desc}</p>
                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#315d4c] transition-all group-hover:gap-2.5">View details <ArrowUpRight size={13} /></div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="container pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-[#dce8d8] p-8 sm:p-14 border border-[#c8d9c2] shadow-sm">
            <div className="relative z-10 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#315d4c] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#d5b36a] shadow-xs">
                <Sparkles size={13} className="animate-spin text-[#d5b36a]" style={{ animationDuration: '4s' }} /> Coming soon
              </div>
              <h2 className="mt-4 font-serif text-4xl sm:text-5xl leading-none text-[#173d35]">A little more<br /><em>adventure.</em></h2>
              <p className="mt-5 max-w-sm leading-7 text-[#315d4c]/85 text-sm sm:text-base">Zip lines, rope courses and wild little memories are on their way to Siddhi.</p>
              <div className="mt-7 flex flex-wrap gap-2.5 text-xs font-semibold uppercase tracking-wider text-[#173d35]">
                <span className="rounded-full bg-white/80 px-4 py-2 shadow-xs border border-white/80 animate-float-slow transition hover:scale-105" style={{ animationDelay: '0s' }}>🪂 Zip line</span>
                <span className="rounded-full bg-white/80 px-4 py-2 shadow-xs border border-white/80 animate-float-slow transition hover:scale-105" style={{ animationDelay: '1s' }}>🧗 Rope course</span>
                <span className="rounded-full bg-white/80 px-4 py-2 shadow-xs border border-white/80 animate-float-slow transition hover:scale-105" style={{ animationDelay: '2s' }}>🏕️ Kids adventure</span>
              </div>
            </div>
            <div className="adventure-shape" style={{ backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.35), rgba(112,144,121,.35)), url(${img('adventureShape')})` }} />
          </div>
        </section>

        <section id="gallery" className="bg-[#f0f3ec] py-24 sm:py-32">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><p className="eyebrow">A glimpse of Siddhi</p><h2 className="section-title">The place is<br /><em>the experience.</em></h2></div>
              <a href="https://customer-assets-wrfwihn1.emergentagent.net/job_siddhi-farm-dev/artifacts/wgys6sb0_Siddhi%20Farm.pdf" target="_blank" rel="noreferrer" className="button-outline shimmer-button">View full photo story <ArrowUpRight size={16} /></a>
            </div>
            <div className="gallery-grid mt-14">
              {[['gallery1', 'Farmhouse'], ['gallery2', 'Villa bedroom'], ['gallery3', 'Swimming pool'], ['gallery4', 'Restaurant'], ['gallery5', 'Party lawn'], ['gallery6', 'Kids adventure']].map(([imageKey, label]) => (
                <figure key={imageKey} className="gallery-tile luxury-card"><img src={img(imageKey)} alt={`${label} at Siddhi Farm Resort`} loading="lazy" /><figcaption>{label}</figcaption></figure>
              ))}
            </div>
          </div>
        </section>

        <footer id="contact" className="bg-[#102f29] pt-14 pb-4 text-white">
          <div className="container grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-4">
                <SiddhiLogo variant="icon" className="h-14 w-14" />
                <div className="flex flex-col">
                  <p className="font-serif text-3xl font-bold tracking-[0.12em] text-white">SIDDHI FARMS</p>
                  <p className="text-[10px] font-semibold tracking-[0.24em] text-[#d5b36a]">FARM &amp; RESORT · PUNE</p>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">A farm resort for slow days, full hearts and stories worth taking home.</p>
            </div>
            <div>
              <p className="eyebrow text-[#d5b36a]">Find us</p>
              <a className="mt-4 block text-sm text-white/70" href="https://maps.app.goo.gl/iBiKXi45sJ99vrV69">Maharashtra, India <MapPin className="ml-1 inline" size={14} /></a>
            </div>
            <div>
              <p className="eyebrow text-[#d5b36a]">Connect</p>
              <a className="mt-4 block text-sm text-white/70" href="tel:7083682768"><Phone className="mr-2 inline" size={14} />7083682768</a>
              <a className="mt-3 block text-sm text-white/70" href="https://www.instagram.com/siddhi_farm_resort"><Instagram className="mr-2 inline" size={14} />Instagram</a>
            </div>
          </div>
          <div className="container mt-12 flex flex-col items-center justify-center gap-2 border-t border-white/10 pt-5 pb-4 text-center text-xs text-white/50">
            <span>© 2026 Siddhi Farm Resort · Come as you are</span>
            <span className="text-[11.5px] text-white/45 font-medium tracking-wide">
              Developed &amp; Maintained by <span className="text-emerald-300 font-semibold">Rushikesh Nigade</span>
            </span>
          </div>
        </footer>

        {bookingOpen && <BookingPanel pricing={pricing} user={user} onClose={() => setBookingOpen(false)} />}
      </main>
    </>
  )
}
