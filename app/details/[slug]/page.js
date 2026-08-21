'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { ArrowLeft, ArrowUpRight, Bath, Bed, Calendar, Car, Check, CreditCard, Home, Loader2, MapPin, Sparkles, Users, Utensils, Waves, Wifi, X, Share2, Printer } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { siteImage } from '@/lib/siteImages'
import UpiPayment from '@/components/upi-payment'
import BookingTerms from '@/components/booking-terms'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import { executeRecaptcha } from '@/lib/recaptcha-client'
import SiddhiLogo from '@/components/siddhi-logo'

const DETAILS = {
  'master-bedroom': {
    title: 'Master Bedroom',
    subtitle: 'A calm, comfortable base for slow mornings.',
    kind: 'stay',
    service: 'Master Bedroom',
    priceKey: 'masterBedroom',
    priceUnit: 'per night',
    hero: '/siddhi/page-06.jpg',
    gallery: ['/siddhi/page-06.jpg', '/siddhi/page-08.jpg', '/siddhi/page-21.jpg'],
    capacity: '2 adults + 1 child',
    beds: 'King-size bed',
    description:
      'Wake up to fresh farm air in one of our three premium master bedrooms. Each room is thoughtfully appointed with soft linens, warm wood accents and generous natural light — the kind of space where a slow morning coffee turns into an hour of doing nothing.',
    amenities: [
      ['AC & fan', Sparkles],
      ['Attached bathroom with hot water', Bath],
      ['King-size bed', Bed],
      ['Farm-view window', Home],
      ['Wi-Fi', Wifi],
      ['Complimentary breakfast', Utensils],
      ['Large parking', Car],
      ['24×7 caretaker', Users],
    ],
    highlights: ['Farm-fresh breakfast included', 'Complimentary tea/coffee tray', 'Wake-up service on request'],
  },
  '2-bhk-villa': {
    title: '2 BHK Villa',
    subtitle: 'Your own spacious hideaway for family time.',
    kind: 'stay',
    service: '2 BHK Villa',
    priceKey: 'villa2BHK',
    priceUnit: 'per night',
    hero: '/siddhi/page-08.jpg',
    gallery: ['/siddhi/page-08.jpg', '/siddhi/page-06.jpg', '/siddhi/page-12.jpg'],
    capacity: '4–6 guests',
    beds: '2 bedrooms · living · kitchenette',
    description:
      'A private two-bedroom villa built for families and small groups. Enjoy a full living room, dining space and your own outdoor sit-out where the countryside sounds keep you company through the evening.',
    amenities: [
      ['AC in every bedroom', Sparkles],
      ['Two attached bathrooms', Bath],
      ['Living + dining area', Home],
      ['Kitchenette', Utensils],
      ['Wi-Fi', Wifi],
      ['Private garden view', MapPin],
      ['Large parking', Car],
      ['Sleeps up to 6', Users],
    ],
    highlights: ['Perfect for family reunions', 'Private outdoor sit-out', 'Farm-fresh meals available'],
  },
  '4-bhk-villa': {
    title: '4 BHK Villa',
    subtitle: 'Room to bring everyone you love.',
    kind: 'stay',
    service: '4 BHK Villa',
    priceKey: 'villa4BHK',
    priceUnit: 'per night',
    hero: '/siddhi/page-12.jpg',
    gallery: ['/siddhi/page-12.jpg', '/siddhi/page-08.jpg', '/siddhi/page-22.jpg'],
    capacity: '8–12 guests',
    beds: '4 bedrooms · living · dining',
    description:
      'Our flagship four-bedroom villa is built for the big gatherings — birthdays, anniversaries and family reunions. Expansive living areas, four private bedrooms and a warm central space make it a home away from home for larger groups.',
    amenities: [
      ['AC in all 4 bedrooms', Sparkles],
      ['Four attached bathrooms', Bath],
      ['Grand living + dining', Home],
      ['Kitchen access', Utensils],
      ['Wi-Fi across villa', Wifi],
      ['Poolside access', Waves],
      ['Large parking for 4+ cars', Car],
      ['Sleeps 8–12 comfortably', Users],
    ],
    highlights: ['Best for large families', 'Ideal for private celebrations', 'Optional in-villa dining'],
  },
  'farm-stays': {
    title: 'Farm Stays',
    subtitle: 'Wake up to birdsong in our spacious master bedrooms and private villas.',
    kind: 'experience',
    service: 'Master Bedroom',
    priceKey: 'masterBedroom',
    priceUnit: 'per night onwards',
    hero: '/siddhi/page-02.jpg',
    gallery: ['/siddhi/page-06.jpg', '/siddhi/page-08.jpg', '/siddhi/page-21.jpg'],
    capacity: 'Any group size',
    beds: '3 master bedrooms · 2 villas',
    description:
      'Our farm stays are the heart of Siddhi. Choose from cozy master bedrooms or expansive villas and let the countryside slow you down. Farm walks, sunset views, warm meals and starry skies are all part of the package.',
    amenities: [
      ['Choose your room type', Home],
      ['Farm-fresh meals', Utensils],
      ['Nature walks', MapPin],
      ['Swimming pool access', Waves],
      ['Wi-Fi', Wifi],
      ['Large parking', Car],
      ['Kids-friendly', Users],
      ['24×7 caretaker', Sparkles],
    ],
    highlights: ['Overnight stay for 2–12 guests', 'All meals available on request', 'Sunrise farm walk included'],
  },
  'one-day-tour': {
    title: 'One Day Tour',
    subtitle: 'A relaxed countryside day for the whole family.',
    kind: 'experience',
    service: 'One Day Tour',
    priceKey: 'oneDayTour',
    priceUnit: 'per person',
    hero: '/siddhi/page-13.jpg',
    gallery: ['/siddhi/page-13.jpg', '/siddhi/page-21.jpg', '/siddhi/page-22.jpg'],
    capacity: 'Any group size',
    beds: 'Day access · no overnight',
    description:
      'Spend a full day on the farm without an overnight stay. Wander the grounds, savour a farm-style lunch, unwind by the pool and let the kids run free through open lawns. Perfect for corporate outings, school picnics or a weekend day-trip with friends.',
    amenities: [
      ['Full-day farm access', MapPin],
      ['Traditional farm lunch', Utensils],
      ['Open lawns & play area', Users],
      ['Nature trails', Sparkles],
      ['Large parking', Car],
      ['Restrooms & changing rooms', Bath],
      ['Ideal for groups', Users],
      ['Kid-friendly activities', Waves],
    ],
    highlights: ['Includes lunch', 'No overnight required', 'Groups welcome — corporate, school picnic, family'],
  },
  'mini-water-park': {
    title: 'Mini Water Park',
    subtitle: 'Splash-worthy fun for the whole family.',
    kind: 'experience',
    service: 'Mini Water Park',
    priceKey: 'miniWaterPark',
    priceUnit: 'per person',
    hero: '/siddhi/page-14.jpg',
    gallery: ['/siddhi/page-14.jpg', '/siddhi/page-13.jpg', '/siddhi/page-22.jpg'],
    capacity: 'All ages',
    beds: 'Day access',
    description:
      'Add on our mini water park to your farm day — a bright, family-friendly splash zone with clean pools, safe slides and plenty of shaded seating for parents. It\u2019s the easiest way to keep kids happy while grown-ups relax.',
    amenities: [
      ['Family swimming pool', Waves],
      ['Kids splash zone', Users],
      ['Water slides', Sparkles],
      ['Changing rooms', Bath],
      ['Poolside seating', Home],
      ['Farm lunch included', Utensils],
      ['Large parking', Car],
      ['Lifeguard on duty', Sparkles],
    ],
    highlights: ['Includes farm lunch', 'Includes one day farm access', 'Safe for all ages'],
  },
  'get-together': {
    title: 'Get-Togethers & Reunions',
    subtitle: 'Spacious open lawns and shaded seating for family and friends.',
    kind: 'experience',
    service: 'Get Together',
    priceKey: 'getTogetherEvent',
    priceUnit: 'per event package',
    hero: '/siddhi/page-02.jpg',
    gallery: ['/siddhi/page-02.jpg', '/siddhi/page-13.jpg', '/siddhi/page-21.jpg'],
    capacity: '20–150 guests',
    beds: 'Full single-day venue access',
    description:
      'Celebrate your family reunions, alumni get-togethers, and milestone anniversaries amidst lush green landscapes. Features open lawns, ambient evening lighting, sound system setup, and catering support.',
    amenities: [
      ['Open celebration lawns', MapPin],
      ['Shaded dining banquet', Home],
      ['Music sound system support', Sparkles],
      ['Clean washrooms & changing rooms', Bath],
      ['Ample private parking', Car],
      ['Farm catering options', Utensils],
      ['Swimming pool access', Waves],
      ['Dedicated event caretaker', Users],
    ],
    highlights: ['Exclusive celebration lawn', 'Custom celebration timing (09:00 AM – 10:00 PM)', 'Ideal for 20–150 guests'],
  },
  'birthday-party': {
    title: 'Birthday & Naming Ceremony',
    subtitle: 'Joyful celebration setups with music, dining, and scenic poolside backdrops.',
    kind: 'experience',
    service: 'Birthday Party',
    priceKey: 'birthdayEvent',
    priceUnit: 'per event package',
    hero: '/siddhi/page-08.jpg',
    gallery: ['/siddhi/page-08.jpg', '/siddhi/page-14.jpg', '/siddhi/page-22.jpg'],
    capacity: '25–100 guests',
    beds: 'Full single-day celebration slot',
    description:
      'Host memorable birthday parties, naming ceremonies (Barse), and baby showers in a refreshing farm atmosphere. Kids enjoy the pool and lawn games while families celebrate in style.',
    amenities: [
      ['Decor-friendly lawn area', Sparkles],
      ['Kids play zones & lawn', Users],
      ['Swimming pool access', Waves],
      ['Sound system for party music', Sparkles],
      ['Catering & dining hall', Utensils],
      ['Dedicated private parking', Car],
      ['AC room for baby/family prep', Home],
      ['Clean washroom facilities', Bath],
    ],
    highlights: ['Decor & stage setup friendly', 'Daytime or evening party slots', 'Complimentary prep room included'],
  },
  'wedding-ceremony': {
    title: 'Weddings & Engagements',
    subtitle: 'Breathtaking countryside open-air ceremonies and mandap lawns.',
    kind: 'experience',
    service: 'Wedding Ceremony',
    priceKey: 'weddingEvent',
    priceUnit: 'per event package',
    hero: '/siddhi/page-12.jpg',
    gallery: ['/siddhi/page-12.jpg', '/siddhi/page-06.jpg', '/siddhi/page-21.jpg'],
    capacity: '50–300 guests',
    beds: 'Full day venue & villas access',
    description:
      'Create timeless memories with an authentic countryside destination wedding, ring ceremony, or sangeet. Expansive green lawns, grand mandap space, villa accommodations, and scenic photography backdrops.',
    amenities: [
      ['Grand mandap lawn', Sparkles],
      ['Banquet dining area', Utensils],
      ['AC preparation rooms', Home],
      ['Swimming pool deck', Waves],
      ['Ample parking for 50+ vehicles', Car],
      ['24×7 event support staff', Users],
      ['Photo & video natural spots', Sparkles],
      ['Generator backup', Sparkles],
    ],
    highlights: ['Grand open-air wedding lawn', 'Full day ceremony access (09:00 AM – 10:00 PM)', 'Villa prep rooms available'],
  },
}

const KIND_LABEL = { stay: 'Stay', experience: 'Experience' }

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

function BookingModal({ slug, config, pricing, user, onClose }) {
  const isPerPerson = config.priceUnit.includes('person')
  const [form, setForm] = useState({
    name: user?.user_metadata?.full_name || '',
    email: user?.email || '',
    phone: user?.user_metadata?.phone || '',
    checkIn: '',
    checkOut: '',
    guests: isPerPerson ? '4' : '2',
    couponCode: '',
    aadhaarNumber: '',
    termsAccepted: false,
  })
  const [booking, setBooking] = useState(null)
  const [stayType, setStayType] = useState('overnight')
  const [shortStayInTime, setShortStayInTime] = useState('11:00')
  const [shortStayOutTime, setShortStayOutTime] = useState('15:00')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [appliedAdvance, setAppliedAdvance] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [allCoupons, setAllCoupons] = useState([])

  const isRoom = config.kind === 'stay'
  const isShortStay = isRoom && stayType === 'short_stay'
  const isSingleDay = isPerPerson || isShortStay

  const rate = Number(pricing[config.priceKey] || 0)
  const nights = form.checkIn && form.checkOut && !isSingleDay
    ? Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000))
    : 1

  let subtotal = 0
  if (isShortStay) {
    const shortKey = `${config.priceKey}ShortStay`
    subtotal = pricing[shortKey] ? Number(pricing[shortKey]) : Math.round(rate * 0.5)
  } else if (isPerPerson) {
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
      const inTime = isShortStay
        ? (shortStayInTime || '11:00')
        : isPerPerson
        ? '09:30'
        : '11:00'

      const outTime = isShortStay
        ? (shortStayOutTime || '15:00')
        : isPerPerson
        ? '18:00'
        : '10:00'

      const recaptchaToken = await executeRecaptcha('booking_submit')

      const payload = {
        ...form,
        recaptchaToken,
        service: config.service,
        checkOut: isSingleDay ? form.checkIn : form.checkOut,
        checkInTime: inTime,
        checkOutTime: outTime,
        isShortStay,
        stayType: isShortStay ? 'short_stay' : (isPerPerson ? 'day_tour' : 'overnight'),
      }

      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Booking failed')
      setBooking(data); setStatus('idle')
    } catch (err) { setError(err.message); setStatus('error') }
  }

  async function payNow() {
    setStatus('paying'); setError('')
    try {
      const res = await fetch('/api/razorpay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment setup failed')
      const options = {
        key: data.keyId, amount: data.amount, currency: data.currency,
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
    } catch (err) { setError(err.message); setStatus('error') }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6 animate-in fade-in duration-200">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-[#fbfaf6] shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl border border-[#dfe7dc]/60">
        <div className="flex items-start justify-between border-b border-[#eef2eb] bg-[#fbfaf6] p-6 pb-4 sm:px-9 sm:pt-8 shrink-0">
          <div><p className="eyebrow">Book · {config.title}</p><h2 className="mt-1 font-serif text-2xl sm:text-3xl text-[#173d35]">Reserve your visit</h2></div>
          <button onClick={onClose} className="rounded-full bg-[#edf1e8] p-2 hover:bg-[#dfe6dc] transition" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:px-9 sm:pb-9">
        {status === 'paid' ? (
          <div className="rounded-2xl bg-[#e5efe4] p-7 text-center text-[#173d35]">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#315d4c] text-white"><Check /></div>
            <h3 className="font-serif text-2xl text-[#173d35]">Payment successful</h3>
            <p className="mt-2 text-sm text-slate-600">Booking <strong>{booking.id}</strong> is confirmed. Our team will be in touch shortly.</p>
            
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
            {booking.applied_coupon && <p className="mt-2 text-xs text-[#315d4c]">Coupon <strong>{booking.applied_coupon}</strong> · –₹{Number(booking.discount).toLocaleString('en-IN')}</p>}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button className="button-primary mt-6 w-full" onClick={payNow} disabled={status === 'paying'}>
              <CreditCard size={16} /> {status === 'paying' ? 'Opening payment…' : `Pay ₹${Number(booking.amount).toLocaleString('en-IN')} with Razorpay`}
            </button>
            <UpiPayment booking={booking} />
          </div>
        ) : (
          <form onSubmit={createBooking} className="grid gap-4 sm:grid-cols-2">
            <input required placeholder="Your name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input required placeholder="Phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <label className="sm:col-span-2">Email (for confirmation)<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
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

            <label className={isSingleDay ? 'sm:col-span-2' : ''}>
              {isSingleDay ? 'Visit date' : 'Check in'}
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
              {isPerPerson && <span className="text-xs text-slate-500 mt-1">Select your visit date</span>}
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

            <label className={isSingleDay ? 'sm:col-span-2' : ''}>
              {isPerPerson ? 'Number of guests' : 'Guests'}
              <input required type="number" min="1" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} />
            </label>
            <label>Coupon or Advance code (optional)
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
                  <span>Total stay value · {units} {isPerPerson ? `guest${units > 1 ? 's' : ''}` : `night${units > 1 ? 's' : ''}`}</span>
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
                  <span>Estimated total · {units} {isPerPerson ? `guest${units > 1 ? 's' : ''}` : `night${units > 1 ? 's' : ''}`}</span>
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

export default function DetailPage({ params }) {
  const { slug } = use(params)
  const config = DETAILS[slug]
  const [pricing, setPricing] = useState({})
  const [images, setImages] = useState({})
  const [user, setUser] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])

  useEffect(() => {
    fetch('/api/pricing').then(r => r.json()).then(setPricing).catch(() => {})
    fetch('/api/images').then(r => r.json()).then(setImages).catch(() => {})
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [supabase])

  if (!config) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfaf6] p-8 text-center">
        <div>
          <p className="eyebrow">404</p>
          <h1 className="mt-3 font-serif text-4xl text-[#173d35]">We couldn’t find that page</h1>
          <Link href="/" className="button-primary mt-6">Back to home</Link>
        </div>
      </main>
    )
  }

  const price = pricing[config.priceKey] || 0

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <main className="min-h-screen bg-[#fbfaf6] pb-16 text-[#173d35]">
        {/* Hero */}
        <div className="relative h-[420px] w-full overflow-hidden md:h-[520px]">
          <img src={siteImage(images, `detail:${slug}:hero`) || config.hero} alt={config.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0c2a22]/80 via-[#0c2a22]/30 to-[#0c2a22]/70" />
          <div className="container relative z-10 flex h-full flex-col justify-between py-8 text-white">
            <Link href="/" className="flex w-max items-center gap-2.5 rounded-full bg-white/15 px-4 py-2 text-xs backdrop-blur hover:bg-white/25">
              <SiddhiLogo className="h-6 w-6" />
              <ArrowLeft size={14} /> Back to home
            </Link>
            <div>
              <p className="eyebrow text-[#e3c77c]">{KIND_LABEL[config.kind]}</p>
              <h1 className="mt-3 font-serif text-5xl leading-[.98] sm:text-6xl">{config.title}</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-white/80">{config.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="container mt-12 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <section>
            <p className="eyebrow">About this {config.kind}</p>
            <p className="mt-4 text-lg leading-8 text-slate-600">{config.description}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#dfe7dc] bg-white p-5"><Users size={18} className="text-[#709079]" /><p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Capacity</p><p className="mt-1 font-serif text-lg">{config.capacity}</p></div>
              <div className="rounded-2xl border border-[#dfe7dc] bg-white p-5"><Bed size={18} className="text-[#709079]" /><p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Space</p><p className="mt-1 font-serif text-lg">{config.beds}</p></div>
              <div className="rounded-2xl border border-[#dfe7dc] bg-white p-5"><Calendar size={18} className="text-[#709079]" /><p className="mt-3 text-xs uppercase tracking-widest text-slate-400">Available</p><p className="mt-1 font-serif text-lg">All year round</p></div>
            </div>

            <h2 className="mt-12 font-serif text-3xl">What’s included</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {config.amenities.map(([label, Icon]) => (
                <div key={label} className="flex items-center gap-3 rounded-xl bg-[#f0f3ec] px-4 py-3 text-sm text-[#173d35]">
                  <Icon size={16} className="text-[#315d4c]" /> {label}
                </div>
              ))}
            </div>

            <h2 className="mt-12 font-serif text-3xl">Little extras</h2>
            <ul className="mt-4 space-y-2">
              {config.highlights.map(h => (
                <li key={h} className="flex items-start gap-3 text-sm text-slate-600"><Check size={16} className="mt-0.5 text-[#315d4c]" /> {h}</li>
              ))}
            </ul>

            <h2 className="mt-12 font-serif text-3xl">Gallery</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {config.gallery.map((src, i) => (
                <img key={i} src={siteImage(images, `detail:${slug}:gallery${i + 1}`) || src} alt={`${config.title} view ${i + 1}`} className="h-40 w-full rounded-xl object-cover" />
              ))}
            </div>
          </section>

          {/* Sticky booking card */}
          <aside>
            <div className="sticky top-6 rounded-3xl border border-[#dfe7dc] bg-white p-7 shadow-sm">
              <p className="eyebrow">Starting from</p>
              <p className="mt-2 font-serif text-4xl text-[#173d35]">₹{price.toLocaleString('en-IN')}</p>
              <p className="text-sm text-slate-500">{config.priceUnit}</p>
              <ul className="mt-6 space-y-2 text-sm text-slate-500">
                <li className="flex gap-2"><Check size={14} className="mt-1 text-[#315d4c]" /> Real-time availability</li>
                <li className="flex gap-2"><Check size={14} className="mt-1 text-[#315d4c]" /> Secure Razorpay payment</li>
                <li className="flex gap-2"><Check size={14} className="mt-1 text-[#315d4c]" /> Free cancellation policy</li>
              </ul>
              <button className="button-primary mt-7 w-full" onClick={() => setModalOpen(true)}>
                Book now <ArrowUpRight size={16} />
              </button>
              <p className="mt-4 text-center text-xs text-slate-400">Or call us at <a className="font-semibold text-[#315d4c]" href="tel:7083682768">7083682768</a></p>
            </div>
          </aside>
        </div>

        {modalOpen && <BookingModal slug={slug} config={config} pricing={pricing} user={user} onClose={() => setModalOpen(false)} />}

        {/* Mobile Sticky Quick Booking Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-white/15 bg-[#173d35]/95 px-5 py-3.5 text-white backdrop-blur-md shadow-2xl lg:hidden">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#d5b36a] font-semibold">Starting from</p>
            <p className="font-serif text-xl font-bold leading-tight">₹{price.toLocaleString('en-IN')} <span className="text-xs font-normal text-white/60">/ {config.priceUnit.replace('per ', '')}</span></p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="button-gold shimmer-button px-5 py-2.5 text-xs font-bold shadow-md"
          >
            Reserve now <ArrowUpRight size={15} />
          </button>
        </div>

        <footer className="mt-20 border-t border-[#dfe7dc] pt-8 text-center text-xs text-slate-400">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 pb-24 sm:pb-6 sm:pr-48">
            <span>© 2026 Siddhi Farm Resort · Come as you are</span>
            <span className="text-[11px] text-slate-500">Developed & Maintained by <span className="font-semibold text-[#173d35]">Rushikesh Nigade</span></span>
          </div>
        </footer>
      </main>
    </>
  )
}
