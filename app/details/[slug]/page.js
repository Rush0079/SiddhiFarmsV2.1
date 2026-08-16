'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { ArrowLeft, ArrowUpRight, Bath, Bed, Calendar, Car, Check, CreditCard, Home, Loader2, MapPin, Sparkles, Users, Utensils, Waves, Wifi, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { siteImage } from '@/lib/siteImages'
import UpiPayment from '@/components/upi-payment'
import BookingTerms from '@/components/booking-terms'

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
}

const KIND_LABEL = { stay: 'Stay', experience: 'Experience' }

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
    termsAccepted: false,
  })
  const [booking, setBooking] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const rate = pricing[config.priceKey] || 0
  const units = isPerPerson ? Number(form.guests) || 1 : (form.checkIn && form.checkOut ? Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000)) : 1)
  const estimate = rate * units

  async function createBooking(event) {
    event.preventDefault()
    setStatus('booking'); setError('')
    try {
      // For per-person experiences, use same-day check-in/out if user only picked a single date
      const payload = { ...form, service: config.service }
      if (isPerPerson && !payload.checkOut && payload.checkIn) {
        const next = new Date(payload.checkIn); next.setDate(next.getDate() + 1)
        payload.checkOut = next.toISOString().slice(0, 10)
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl bg-[#fbfaf6] p-6 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:p-9">
        <div className="mb-7 flex items-start justify-between">
          <div><p className="eyebrow">Book · {config.title}</p><h2 className="mt-2 font-serif text-3xl text-[#173d35]">Reserve your visit</h2></div>
          <button onClick={onClose} className="rounded-full bg-[#edf1e8] p-2" aria-label="Close"><X size={18} /></button>
        </div>

        {status === 'paid' ? (
          <div className="rounded-2xl bg-[#e5efe4] p-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#315d4c] text-white"><Check /></div>
            <h3 className="font-serif text-2xl text-[#173d35]">Payment successful</h3>
            <p className="mt-2 text-sm text-slate-600">Booking <strong>{booking.id}</strong> is confirmed. Our team will call you soon.</p>
            <button className="button-primary mt-6" onClick={onClose}>Done</button>
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
            <label>{isPerPerson ? 'Visit date' : 'Check in'}<input required type="date" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} /></label>
            <label>{isPerPerson ? 'End date (optional)' : 'Check out'}<input required={!isPerPerson} type="date" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} /></label>
            <label>{isPerPerson ? 'Number of guests' : 'Guests'}<input required type="number" min="1" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} /></label>
            <label>Coupon (optional)<input placeholder="MONSOON30" value={form.couponCode} onChange={e => setForm({ ...form, couponCode: e.target.value })} /></label>
            <div className="flex items-center justify-between rounded-xl bg-[#edf1e8] p-4 text-sm sm:col-span-2">
              <span>Estimated total · {units} {isPerPerson ? `guest${units > 1 ? 's' : ''}` : `night${units > 1 ? 's' : ''}`}</span>
              <strong className="text-lg text-[#173d35]">₹{estimate.toLocaleString('en-IN')}</strong>
            </div>
            <div className="sm:col-span-2"><BookingTerms checked={form.termsAccepted} onChange={termsAccepted => setForm({ ...form, termsAccepted })} /></div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <button className="button-primary sm:col-span-2" type="submit" disabled={status === 'booking'}>
              {status === 'booking' ? 'Checking availability…' : <>Continue to payment <ArrowUpRight size={17} /></>}
            </button>
          </form>
        )}
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
            <Link href="/" className="flex w-max items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs backdrop-blur hover:bg-white/25"><ArrowLeft size={14} /> Back to home</Link>
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
      </main>
    </>
  )
}
