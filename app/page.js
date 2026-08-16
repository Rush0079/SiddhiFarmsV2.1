'use client'

import { useEffect, useMemo, useState } from 'react'
import Script from 'next/script'
import { ArrowUpRight, CalendarDays, Check, ChevronDown, CreditCard, Instagram, LogOut, MapPin, Menu, Phone, Sparkles, Star, User, Waves, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { siteImage } from '@/lib/siteImages'
import UpiPayment from '@/components/upi-payment'
import BookingTerms from '@/components/booking-terms'

const experiences = [
  ['farm-stays', 'Farm stays', 'Wake up to birdsong in our spacious master bedrooms and private villas.', 'masterBedroom', 'per night'],
  ['one-day-tour', 'One Day Tour', 'A relaxed countryside day with lunch and open-lawn play. No overnight required.', 'oneDayTour', 'per person'],
  ['mini-water-park', 'Mini Water Park', 'Splash-worthy fun with slides, kid zones and shaded seating for parents.', 'miniWaterPark', 'per person'],
]
const stayCards = [
  ['master-bedroom', '01', 'Master bedrooms', 'A calm, comfortable base for slow mornings.', 'masterBedroom', 'stayMasterBedroom'],
  ['2-bhk-villa', '02', '2 BHK Villa', 'Your own spacious hideaway for family time.', 'villa2BHK', 'stayVilla2BHK'],
  ['4-bhk-villa', '03', '4 BHK Villa', 'Room to bring everyone you love.', 'villa4BHK', 'stayVilla4BHK'],
]
const serviceKeys = { 'Master Bedroom': 'masterBedroom', '2 BHK Villa': 'villa2BHK', '4 BHK Villa': 'villa4BHK', 'One Day Tour': 'oneDayTour', 'Mini Water Park': 'miniWaterPark', 'Wedding Ceremony': 'weddingEvent', 'Engagement Ceremony': 'engagementEvent', 'Birthday Party': 'birthdayEvent', 'Get Together': 'getTogetherEvent' }

function BookingPanel({ pricing, user, onClose }) {
  const [form, setForm] = useState({ name: user?.user_metadata?.full_name || '', email: user?.email || '', phone: user?.user_metadata?.phone || '', checkIn: '', checkOut: '', service: 'Master Bedroom', guests: '2', couponCode: '', termsAccepted: false })
  const [booking, setBooking] = useState(null)
  const [status, setStatus] = useState('idle') // idle | booking | paying | paid | error
  const [error, setError] = useState('')

  const nights = form.checkIn && form.checkOut ? Math.max(1, Math.ceil((new Date(form.checkOut) - new Date(form.checkIn)) / 86400000)) : 1
  const rate = pricing[serviceKeys[form.service]] || 0
  const estimate = rate * nights

  async function createBooking(event) {
    event.preventDefault()
    setStatus('booking'); setError('')
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-3xl bg-[#fbfaf6] p-6 shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl sm:p-9">
        <div className="mb-7 flex items-start justify-between">
          <div><p className="eyebrow">Reserve your stay</p><h2 className="mt-2 font-serif text-3xl text-[#173d35]">Make it a Siddhi day</h2></div>
          <button onClick={onClose} className="rounded-full bg-[#edf1e8] p-2" aria-label="Close"><X size={18} /></button>
        </div>

        {status === 'paid' ? (
          <div className="rounded-2xl bg-[#e5efe4] p-7 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#315d4c] text-white"><Check /></div>
            <h3 className="font-serif text-2xl text-[#173d35]">Payment successful</h3>
            <p className="mt-2 text-sm text-slate-600">Booking <strong>{booking.id}</strong> is confirmed. A team member will be in touch shortly.</p>
            <button className="button-primary mt-6" onClick={onClose}>Done</button>
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
            <label>Check in<input required type="date" value={form.checkIn} onChange={e => setForm({ ...form, checkIn: e.target.value })} /></label>
            <label>Check out<input required type="date" value={form.checkOut} onChange={e => setForm({ ...form, checkOut: e.target.value })} /></label>
            <label>Stay, day tour or event<select value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>{Object.keys(serviceKeys).map(item => <option key={item}>{item}</option>)}</select></label>
            <label>Guests<input required type="number" min="1" value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })} /></label>
            <label className="sm:col-span-2">Coupon code (optional)<input placeholder="MONSOON30" value={form.couponCode} onChange={e => setForm({ ...form, couponCode: e.target.value })} /></label>
            <div className="flex items-center justify-between rounded-xl bg-[#edf1e8] p-4 text-sm sm:col-span-2">
              <span>Estimated total · {nights} night{nights > 1 ? 's' : ''}</span>
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
            <a href="#top" className="font-serif text-2xl font-bold tracking-tight text-white">Siddhi<span className="text-[#d5b36a]">.</span></a>
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
              <button className="button-light" onClick={() => setBookingOpen(true)}>Plan your visit <ArrowUpRight size={16} /></button>
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

        <section id="top" className="hero flex min-h-[720px] items-end" style={{ backgroundImage: `linear-gradient(90deg, rgba(12,42,34,.92) 0%, rgba(18,57,46,.62) 48%, rgba(16,47,39,.2) 100%), url(${img('homeHero')})` }}>
          <div className="container relative z-10 pb-20 pt-36">
            <div className="max-w-3xl">
              <p className="eyebrow text-[#e3c77c]">Farm stays · Agro tourism · Celebrations</p>
              <h1 className="mt-5 font-serif text-6xl leading-[.95] tracking-tight text-white sm:text-8xl">Come for the <em className="font-normal text-[#e3c77c]">green.</em><br />Stay for the feeling.</h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-white/75">A quiet corner of the countryside where good food, open skies and unhurried time come together.</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <button className="button-gold" onClick={() => setBookingOpen(true)}>Plan your visit <ArrowUpRight size={17} /></button>
                <a className="button-ghost" href="#story">Discover Siddhi <ArrowUpRight size={17} /></a>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 right-8 hidden items-center gap-3 text-xs text-white/60 lg:flex"><span className="h-px w-12 bg-white/40" /> Maharashtra, India</div>
        </section>

        <section className="border-b border-[#dfe6dc] bg-[#f4f5ef]">
          <div className="container grid grid-cols-2 divide-x divide-[#dfe6dc] sm:grid-cols-4">
            {stats.map(([n, label]) => (
              <div key={label} className="px-4 py-8 text-center first:pl-0 sm:py-10">
                <p className="font-serif text-3xl text-[#315d4c]">{n}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[.16em] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="story" className="container grid gap-14 py-24 sm:py-32 md:grid-cols-[.8fr_1.2fr] md:items-center">
          <div><p className="eyebrow">The Siddhi feeling</p><h2 className="section-title">A little closer<br /><em>to what matters.</em></h2></div>
          <div>
            <p className="max-w-xl text-lg leading-8 text-slate-600">At Siddhi Farm Resort, the days are shaped by nature. Wander through our farm, dip into the pool, share a long meal, or simply find a shady spot and do absolutely nothing.</p>
            <div className="mt-8 grid gap-3 text-sm text-[#315d4c] sm:grid-cols-2">
              <span><Check size={16} className="mr-2 inline" /> Farm-fresh experiences</span>
              <span><Check size={16} className="mr-2 inline" /> Spacious private stays</span>
              <span><Check size={16} className="mr-2 inline" /> Made for celebrations</span>
              <span><Check size={16} className="mr-2 inline" /> Warm local hospitality</span>
            </div>
          </div>
        </section>

        <section id="experiences" className="bg-[#173d35] py-24 text-white sm:py-32">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div><p className="eyebrow text-[#d5b36a]">Choose your pace</p><h2 className="section-title text-white">There is always<br /><em>more to experience.</em></h2></div>
              <Sparkles className="hidden text-[#d5b36a] md:block" size={42} strokeWidth={1} />
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/15 md:grid-cols-3">
              {experiences.map(([slug, title, desc, priceKey, unit], i) => {
                const rate = pricing[priceKey] || 0
                return (
                  <a href={`/details/${slug}`} key={slug} className="group block bg-[#214b40] p-8 transition hover:bg-[#2b594b] sm:p-10">
                    <span className="text-sm text-[#d5b36a]">0{i + 1}</span>
                    <h3 className="mt-20 font-serif text-3xl">{title}</h3>
                    <p className="mt-4 min-h-14 text-sm leading-6 text-white/65">{desc}</p>
                    <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-5 text-sm">
                      <span>₹{rate.toLocaleString('en-IN')} <span className="text-white/50">/ {unit.replace('per ', '')}</span></span>
                      <ArrowUpRight className="transition group-hover:translate-x-1 group-hover:-translate-y-1" size={18} />
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
            <button className="button-outline" onClick={() => setBookingOpen(true)}>View availability <ArrowUpRight size={16} /></button>
          </div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {stayCards.map(([slug, no, title, desc, priceKey, imageKey]) => (
              <a href={`/details/${slug}`} className="stay-card group block transition hover:-translate-y-1 hover:shadow-xl" key={slug}>
                <div className="stay-image" style={{ backgroundImage: `linear-gradient(0deg, rgba(18,57,46,.28), transparent), url(${img(imageKey)})` }}><span>{no}</span></div>
                <div className="p-6">
                  <div className="flex justify-between"><h3 className="font-serif text-2xl text-[#173d35]">{title}</h3><span className="text-sm text-slate-500">₹{(pricing[priceKey] || 0).toLocaleString('en-IN')}+</span></div>
                  <p className="mt-3 text-sm leading-6 text-slate-500">{desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-[#315d4c] transition group-hover:gap-2">View details <ArrowUpRight size={13} /></div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="container pb-24">
          <div className="relative overflow-hidden rounded-3xl bg-[#dce8d8] p-8 sm:p-14">
            <div className="relative z-10 max-w-xl">
              <p className="eyebrow text-[#315d4c]">Coming soon</p>
              <h2 className="mt-4 font-serif text-5xl leading-none text-[#173d35]">A little more<br /><em>adventure.</em></h2>
              <p className="mt-5 max-w-sm leading-7 text-[#315d4c]/75">Zip lines, rope courses and wild little memories are on their way to Siddhi.</p>
              <div className="mt-7 flex flex-wrap gap-2 text-xs uppercase tracking-widest text-[#315d4c]">
                <span className="rounded-full bg-white/60 px-3 py-2">Zip line</span>
                <span className="rounded-full bg-white/60 px-3 py-2">Rope course</span>
                <span className="rounded-full bg-white/60 px-3 py-2">Kids adventure</span>
              </div>
            </div>
            <div className="adventure-shape" style={{ backgroundImage: `linear-gradient(135deg, rgba(255,255,255,.35), rgba(112,144,121,.35)), url(${img('adventureShape')})` }} />
          </div>
        </section>

        <section id="gallery" className="bg-[#f0f3ec] py-24 sm:py-32">
          <div className="container">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div><p className="eyebrow">A glimpse of Siddhi</p><h2 className="section-title">The place is<br /><em>the experience.</em></h2></div>
              <a href="https://customer-assets-wrfwihn1.emergentagent.net/job_siddhi-farm-dev/artifacts/wgys6sb0_Siddhi%20Farm.pdf" target="_blank" rel="noreferrer" className="button-outline">View full photo story <ArrowUpRight size={16} /></a>
            </div>
            <div className="gallery-grid mt-14">
              {[['gallery1', 'Farmhouse'], ['gallery2', 'Villa bedroom'], ['gallery3', 'Swimming pool'], ['gallery4', 'Restaurant'], ['gallery5', 'Party lawn'], ['gallery6', 'Kids adventure']].map(([imageKey, label]) => (
                <figure key={imageKey} className="gallery-tile"><img src={img(imageKey)} alt={`${label} at Siddhi Farm Resort`} loading="lazy" /><figcaption>{label}</figcaption></figure>
              ))}
            </div>
          </div>
        </section>

        <footer id="contact" className="bg-[#102f29] py-14 text-white">
          <div className="container grid gap-10 sm:grid-cols-2 md:grid-cols-4">
            <div className="md:col-span-2">
              <p className="font-serif text-3xl">Siddhi<span className="text-[#d5b36a]">.</span></p>
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
          <div className="container mt-14 border-t border-white/10 pt-5 text-xs text-white/35">© 2026 Siddhi Farm Resort · Come as you are</div>
        </footer>

        {bookingOpen && <BookingPanel pricing={pricing} user={user} onClose={() => setBookingOpen(false)} />}
      </main>
    </>
  )
}
