'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, Clock3, Edit3, Image as ImageIcon, LayoutDashboard, LogOut, Percent, Plus, QrCode, RotateCcw, Save, ScrollText, ShieldCheck, Trash2, Upload, Users, Loader2, X } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { IMAGE_SECTIONS } from '@/lib/siteImages'

const labels = { masterBedroom: 'Master bedroom', villa2BHK: '2 BHK villa', villa4BHK: '4 BHK villa', oneDayTour: 'One day tour', miniWaterPark: 'One day tour + mini water park', weddingEvent: 'Wedding event', engagementEvent: 'Engagement event', birthdayEvent: 'Birthday event', getTogetherEvent: 'Get-together event' }

function displayBookingTime(value, fallback) {
  const [hours, minutes] = String(value || fallback).split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes || 0).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [profile, setProfile] = useState(null)
  const [pricing, setPricing] = useState({})
  const [summary, setSummary] = useState({})
  const [bookings, setBookings] = useState([])
  const [coupons, setCoupons] = useState([])
  const [customers, setCustomers] = useState([])
  const [coupon, setCoupon] = useState({ code: '', value: '', type: 'percentage' })
  const [newRate, setNewRate] = useState({ name: '', price: '' })
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('overview')
  const [images, setImages] = useState({})
  const [uploadingKey, setUploadingKey] = useState(null)
  const [pendingImageKey, setPendingImageKey] = useState(null)
  const fileInputRef = useRef(null)
  const [payments, setPayments] = useState({ upiId: '', upiName: '', qrUrl: '' })
  const [paySaved, setPaySaved] = useState(false)
  const [qrUploading, setQrUploading] = useState(false)
  const qrInputRef = useRef(null)
  const [timeEditor, setTimeEditor] = useState(null)
  const [savingTimes, setSavingTimes] = useState(false)
  const [bookingTerms, setBookingTerms] = useState({ version: '', terms: [] })
  const [termsText, setTermsText] = useState('')
  const [termsSaved, setTermsSaved] = useState(false)

  async function loadAll() {
    const [p, s, b, c, i, pay, terms] = await Promise.all([
      fetch('/api/pricing'),
      fetch('/api/admin/summary'),
      fetch('/api/bookings'),
      fetch('/api/coupons'),
      fetch('/api/images'),
      fetch('/api/payments/config'),
      fetch('/api/booking-terms'),
    ])
    setPricing(await p.json())
    setSummary(await s.json())
    setBookings(await b.json())
    setCoupons(await c.json())
    setImages(await i.json())
    setPayments(await pay.json())
    const termsData = await terms.json()
    setBookingTerms(termsData)
    setTermsText((termsData.terms || []).join('\n'))

    const cust = await fetch('/api/admin/customers')
    if (cust.ok) setCustomers(await cust.json())
  }

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      await loadAll()
    })()
  }, [])

  async function savePricing() {
    await fetch('/api/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pricing) })
    setSaved(true); setTimeout(() => setSaved(false), 1800)
  }
  async function savePricingMap(map) {
    setPricing(map)
    await fetch('/api/pricing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(map) })
    loadAll()
  }
  function addRate(event) {
    event.preventDefault()
    const name = newRate.name.trim()
    const price = Number(newRate.price)
    if (!name || !(price >= 0)) return
    let key = ('custom_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')).slice(0, 40) || 'custom_rate'
    while (key in pricing) key = `${key}_2`.slice(0, 40)
    setNewRate({ name: '', price: '' })
    savePricingMap({ ...pricing, [key]: price, _labels: { ...(pricing._labels || {}), [key]: name } })
  }
  function deleteRate(key) {
    if (!window.confirm('Delete this rate? This cannot be undone.')) return
    const next = { ...pricing, _labels: { ...(pricing._labels || {}) } }
    delete next[key]
    delete next._labels[key]
    savePricingMap(next)
  }
  async function createCoupon(event) {
    event.preventDefault()
    await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(coupon) })
    setCoupon({ code: '', value: '', type: 'percentage' })
    loadAll()
  }
  async function updateBooking(id, status) {
    const res = await fetch(`/api/bookings/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { window.alert(data.error || 'Could not update the booking'); return }
    if (status === 'confirmed' && data.email) {
      window.alert(data.email.sent
        ? `Owner report accepted for delivery to ${data.email.owners || 0} configured owner email address(es).`
        : `Booking confirmed, but the owner email was not sent (${data.email.reason || 'unknown error'}).`)
    }
    loadAll()
  }
  async function deleteCoupon(id) {
    if (!window.confirm('Delete this coupon? This cannot be undone.')) return
    await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
    loadAll()
  }
  async function deleteBooking(id) {
    if (!window.confirm('Delete this booking request? This cannot be undone.')) return
    await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
    loadAll()
  }
  async function setImageUrl(key, url) {
    const res = await fetch('/api/images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, url }) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error || 'Could not save image') }
    loadAll()
  }
  function pickImageFile(key) {
    setPendingImageKey(key)
    fileInputRef.current?.click()
  }
  async function uploadImage(key, file) {
    setUploadingKey(key)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('key', key)
    const res = await fetch('/api/images/upload', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error || 'Upload failed') }
    setUploadingKey(null)
    loadAll()
  }
  async function savePayments() {
    const res = await fetch('/api/payments/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payments) })
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error || 'Could not save payment settings'); return }
    setPaySaved(true); setTimeout(() => setPaySaved(false), 1800)
    loadAll()
  }
  async function saveBookingTerms() {
    const terms = termsText.split('\n').map(term => term.trim()).filter(Boolean)
    if (!bookingTerms.version.trim() || !terms.length) {
      window.alert('Add a version and at least one term.')
      return
    }
    const res = await fetch('/api/booking-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: bookingTerms.version, terms }),
    })
    if (!res.ok) { const data = await res.json().catch(() => ({})); window.alert(data.error || 'Could not save booking terms'); return }
    setTermsSaved(true); setTimeout(() => setTermsSaved(false), 1800)
    loadAll()
  }
  async function uploadQr(file) {
    setQrUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/payments/qr', { method: 'POST', body: fd })
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error || 'QR upload failed') }
    setQrUploading(false)
    loadAll()
  }
  async function markPaid(item) {
    const claim = (item.notes || '').split('\n').filter(l => l.includes('UPI claim')).pop()
    if (!window.confirm(`Mark booking ${item.id} as paid and confirmed?${claim ? `\n\n${claim}` : ''}`)) return
    await fetch(`/api/bookings/${item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paid: true, status: 'confirmed' }) })
    loadAll()
  }
  async function saveBookingTimes() {
    if (!timeEditor) return
    setSavingTimes(true)
    const res = await fetch(`/api/bookings/${timeEditor.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checkInTime: timeEditor.checkInTime, checkOutTime: timeEditor.checkOutTime }) })
    setSavingTimes(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error || 'Could not save booking times'); return }
    setTimeEditor(null)
    loadAll()
  }
  async function changeRole(userId, role) {
    await fetch('/api/admin/customers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, role }) })
    loadAll()
  }
  async function removeRole(userId) {
    if (!window.confirm('Remove this assigned role? The user becomes a regular customer.')) return
    const res = await fetch(`/api/admin/customers/${userId}`, { method: 'DELETE' })
    if (!res.ok) { const d = await res.json().catch(() => ({})); window.alert(d.error || 'Could not remove role') }
    loadAll()
  }
  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!profile) return <div className="flex min-h-screen items-center justify-center text-[#173d35]"><Loader2 className="animate-spin" /></div>

  const canManagePricing = ['manager', 'super_admin'].includes(profile.role)
  const canDelete = ['manager', 'super_admin'].includes(profile.role)
  const canManageRoles = profile.role === 'super_admin'
  const rootAdminId = customers.filter(u => u.role === 'super_admin').reduce((a, b) => (!a || new Date(b.created_at) < new Date(a.created_at) ? b : a), null)?.id
  const sections = [
    ['overview', 'Overview'],
    ['bookings', 'Bookings'],
    ...(canManagePricing ? [['pricing', 'Pricing & offers'], ['payments', 'Payments'], ['content', 'Images & terms']] : []),
    ...(canManageRoles ? [['customers', 'Admins']] : []),
  ]

  return (
    <main className="min-h-screen bg-[#f3f5ef] text-[#173d35]">
      <header className="border-b border-[#dbe4d7] bg-[#173d35] text-white">
        <div className="container flex min-h-20 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-[#d5b36a] p-2 text-[#173d35]"><LayoutDashboard size={18} /></div>
            <div>
              <p className="font-serif text-xl">Siddhi Admin</p>
              <p className="text-[10px] uppercase tracking-[.18em] text-white/55">Operations centre · {profile.role.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 text-sm text-white/70"><ArrowLeft size={15} /> Site</a>
            <button onClick={signOut} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-sm text-white/80 hover:bg-white/20"><LogOut size={14} /> Sign out</button>
          </div>
        </div>
      </header>
      <div className="container py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Signed in as {profile.email}</p>
            <h1 className="section-title mt-2 text-4xl">Good day, {profile.full_name || 'team'}.</h1>
            <p className="mt-3 text-sm text-slate-500">Manage live resort pricing, bookings, coupons and team access.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-[#e3eee1] px-4 py-2 text-xs text-[#315d4c]"><ShieldCheck size={15} /> Secured with Supabase Auth</div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[['Bookings', summary.bookings || 0], ['Pending', summary.pending || 0], ['Confirmed', summary.confirmed || 0], ['Revenue', `₹${(summary.revenue || 0).toLocaleString('en-IN')}`], ['Active coupons', summary.activeCoupons || 0]].map(([title, value]) => (
            <div className="rounded-2xl border border-[#dfe7dc] bg-white p-5" key={title}>
              <p className="text-xs text-slate-500">{title}</p>
              <p className="mt-3 font-serif text-2xl text-[#315d4c]">{value}</p>
            </div>
          ))}
        </div>

        <nav className="mt-8 flex gap-2 overflow-x-auto border-b border-[#dfe7dc] pb-3" aria-label="Admin sections">
          {sections.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${tab === id ? 'bg-[#173d35] text-white shadow-sm' : 'bg-white text-[#315d4c] hover:bg-[#e3eee1]'}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8">
            <p className="eyebrow">Siddhi Farm Resort</p>
            <h2 className="mt-2 font-serif text-3xl">Your booking operations, in one place.</h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600">This dashboard keeps the resort website in sync with your daily operations: guests discover stays and experiences, submit a booking request, accept your terms, and continue to payment. Your team can then manage every step without leaving the dashboard.</p>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-[#f3f5ef] p-5"><p className="text-sm font-semibold text-[#173d35]">Guest journey</p><p className="mt-2 text-sm leading-6 text-slate-600">Booking request → terms email → payment → confirmation and invoice.</p></div>
              <div className="rounded-xl bg-[#f3f5ef] p-5"><p className="text-sm font-semibold text-[#173d35]">Content control</p><p className="mt-2 text-sm leading-6 text-slate-600">Update resort imagery and booking terms from one managed space.</p></div>
              <div className="rounded-xl bg-[#f3f5ef] p-5"><p className="text-sm font-semibold text-[#173d35]">Daily workflow</p><p className="mt-2 text-sm leading-6 text-slate-600">Review requests, set arrival times, verify payments, and keep availability accurate.</p></div>
            </div>
          </section>
        )}

        {tab === 'pricing' && <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.25fr]">
          {canManagePricing && (
            <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6">
              <div className="flex items-center justify-between">
                <div><p className="eyebrow">Pricing management</p><h2 className="mt-2 font-serif text-2xl">Season-ready rates</h2></div>
                <Edit3 size={19} className="text-[#709079]" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {Object.entries(labels).map(([key, label]) => (
                  <label key={key}>{label}<div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-400">₹</span><input className="pl-7" type="number" min="0" value={pricing[key] ?? ''} onChange={e => setPricing({ ...pricing, [key]: Number(e.target.value) })} /></div></label>
                ))}
                {Object.entries(pricing._labels || {}).map(([key, label]) => (
                  <label key={key}>
                    <span className="flex items-center justify-between">{label}<button type="button" title="Delete rate" onClick={() => deleteRate(key)} className="rounded-full p-1 text-red-500 hover:bg-red-100"><Trash2 size={13} /></button></span>
                    <div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-400">₹</span><input className="pl-7" type="number" min="0" value={pricing[key] ?? ''} onChange={e => setPricing({ ...pricing, [key]: Number(e.target.value) })} /></div>
                  </label>
                ))}
              </div>
              <form onSubmit={addRate} className="mt-5 flex flex-wrap items-end gap-3 rounded-xl bg-[#f3f5ef] p-4">
                <label className="flex-1 basis-40">New rate name<input required placeholder="Jacuzzi add-on" value={newRate.name} onChange={e => setNewRate({ ...newRate, name: e.target.value })} /></label>
                <label className="w-32">Price<div className="relative"><span className="absolute left-3 top-3 text-sm text-slate-400">₹</span><input className="pl-7" required type="number" min="0" value={newRate.price} onChange={e => setNewRate({ ...newRate, price: e.target.value })} /></div></label>
                <button className="button-outline" type="submit"><Plus size={15} /> Add rate</button>
              </form>
              <p className="mt-3 text-xs text-slate-400">Core rates power live bookings and can be edited but not deleted. Rates you add can be deleted anytime.</p>
              <button className="button-primary mt-4 w-full" onClick={savePricing}>{saved ? <><Check size={16} /> Saved</> : <><Save size={16} /> Save pricing</>}</button>
            </section>
          )}

          <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6">
            <div><p className="eyebrow">Coupon manager</p><h2 className="mt-2 font-serif text-2xl">Create an offer</h2></div>
            <form onSubmit={createCoupon} className="mt-6 grid gap-4 sm:grid-cols-3">
              <label>Code<input required placeholder="MONSOON30" value={coupon.code} onChange={e => setCoupon({ ...coupon, code: e.target.value })} /></label>
              <label>Discount<input required type="number" min="1" value={coupon.value} onChange={e => setCoupon({ ...coupon, value: e.target.value })} /></label>
              <label>Type<select value={coupon.type} onChange={e => setCoupon({ ...coupon, type: e.target.value })}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
              <button className="button-outline sm:col-span-3" type="submit"><Percent size={16} /> Create coupon</button>
            </form>
            <div className="mt-6 space-y-2">
              {coupons.length ? coupons.map(item => (
                <div className="flex items-center justify-between rounded-xl bg-[#f3f5ef] px-4 py-3 text-sm" key={item.id}>
                  <strong>{item.code}</strong>
                  <div className="flex items-center gap-2">
                    <span>{item.value}{item.type === 'percentage' ? '%' : '₹'} off · {item.active ? 'Active' : 'Paused'}</span>
                    {canDelete && (
                      <button onClick={() => deleteCoupon(item.id)} title="Delete coupon" className="rounded-full p-2 text-red-500 hover:bg-red-100"><Trash2 size={15} /></button>
                    )}
                  </div>
                </div>
              )) : <p className="text-sm text-slate-400">No coupons created yet.</p>}
            </div>
          </section>
        </div>}

        {canManagePricing && tab === 'payments' && (
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">UPI fallback</p><h2 className="mt-2 font-serif text-2xl">Direct UPI payments</h2></div>
              <QrCode size={19} className="text-[#709079]" />
            </div>
            <p className="mt-2 text-sm text-slate-500">Shown to guests as a backup when Razorpay doesn't work. Leave both fields empty to hide the option. Guests who pay this way appear as "UPI claimed" in the booking desk — verify in your UPI app, then Mark paid.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label>UPI ID<input placeholder="siddhifarm@ybl" value={payments.upiId} onChange={e => setPayments({ ...payments, upiId: e.target.value })} /></label>
              <label>Payee name<input placeholder="Siddhi Farm Resort" value={payments.upiName} onChange={e => setPayments({ ...payments, upiName: e.target.value })} /></label>
              <button className="button-primary" onClick={savePayments}>{paySaved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save</>}</button>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              {payments.qrUrl ? (
                <img src={payments.qrUrl} alt="UPI QR code" className="h-32 w-32 rounded-xl border border-[#e5ebe1] bg-white object-contain p-2" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-[#c6d2c3] text-[#709079]"><QrCode size={28} /></div>
              )}
              <div className="space-y-2">
                <button className="button-outline" onClick={() => qrInputRef.current?.click()} disabled={qrUploading}>
                  {qrUploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><Upload size={15} /> {payments.qrUrl ? 'Replace QR code' : 'Upload QR code'}</>}
                </button>
                {payments.qrUrl && <button className="block text-xs text-red-500 hover:underline" onClick={() => { setPayments({ ...payments, qrUrl: '' }); fetch('/api/payments/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payments, qrUrl: '' }) }).then(loadAll) }}>Remove QR code</button>}
                <p className="text-xs text-slate-400">Export the QR from your UPI app (GPay / PhonePe / Paytm business).</p>
              </div>
              <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadQr(f); e.target.value = '' }} />
            </div>
          </section>
        )}

        {canManagePricing && tab === 'content' && (
          <>
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">Image manager</p><h2 className="mt-2 font-serif text-2xl">Every photo, your pick</h2></div>
              <ImageIcon size={19} className="text-[#709079]" />
            </div>
            <p className="mt-2 text-sm text-slate-500">Upload a new photo, or paste an image URL and press Enter. Reset returns a slot to its built-in photo.</p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f && pendingImageKey) uploadImage(pendingImageKey, f); e.target.value = '' }} />
            {IMAGE_SECTIONS.map(section => (
              <div key={section.title} className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">{section.title}</p>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {section.slots.map(slot => {
                    const override = images[slot.key]
                    return (
                      <div key={slot.key} className="flex items-center gap-3 rounded-xl border border-[#e5ebe1] bg-[#fbfcf9] p-3">
                        <img src={override || slot.def} alt={slot.label} className="h-14 w-20 shrink-0 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {slot.label}
                            {override && <span className="ml-2 rounded-full bg-[#e3eee1] px-2 py-0.5 text-[10px] text-[#315d4c]">Custom</span>}
                          </p>
                          <input
                            key={`${slot.key}:${override || ''}`}
                            className="mt-1 w-full py-1.5 text-xs"
                            placeholder="Paste image URL + Enter"
                            defaultValue={override || ''}
                            onKeyDown={e => { if (e.key === 'Enter') setImageUrl(slot.key, e.target.value.trim()) }}
                          />
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button title="Upload image" onClick={() => pickImageFile(slot.key)} className="rounded-full p-2 text-[#315d4c] hover:bg-[#e3eee1]">
                            {uploadingKey === slot.key ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                          </button>
                          {override && (
                            <button title="Reset to default" onClick={() => setImageUrl(slot.key, '')} className="rounded-full p-2 text-slate-400 hover:bg-slate-100"><RotateCcw size={15} /></button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div><p className="eyebrow">Booking terms</p><h2 className="mt-2 font-serif text-2xl">Terms shown and emailed to guests</h2></div>
              <ScrollText size={19} className="text-[#709079]" />
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Use one line per condition. A booking stores the exact version and terms accepted, then emails that same copy to the customer.</p>
            <div className="mt-6 max-w-4xl space-y-5">
              <label className="block max-w-sm">Terms version<input className="mt-2 w-full" value={bookingTerms.version} placeholder="2026-08-16" onChange={event => setBookingTerms({ ...bookingTerms, version: event.target.value })} /></label>
              <label className="block">Terms and conditions<span className="mt-1 block text-xs font-normal normal-case tracking-normal text-slate-500">One condition per line</span><textarea rows="12" className="mt-2 min-h-72 w-full resize-y rounded-xl border border-[#cfdacc] bg-[#fbfcf9] px-4 py-3 leading-6 text-[#173d35] outline-none transition focus:border-[#315d4c] focus:ring-2 focus:ring-[#dce9d9]" value={termsText} placeholder="One condition per line" onChange={event => setTermsText(event.target.value)} /></label>
            </div>
            <div className="mt-6 flex max-w-4xl justify-end"><button className="button-primary" onClick={saveBookingTerms}>{termsSaved ? <><Check size={15} /> Saved</> : <><Save size={15} /> Save booking terms</>}</button></div>
          </section>
          </>
        )}

        {tab === 'bookings' && <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6">
          <p className="eyebrow">Booking desk</p>
          <h2 className="mt-2 font-serif text-2xl">Recent requests</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
                <tr><th className="pb-3">Guest</th><th className="pb-3">Stay</th><th className="pb-3">Dates</th><th className="pb-3">Times</th><th className="pb-3">Total</th><th className="pb-3">Paid</th><th className="pb-3">Status</th>{canDelete && <th className="pb-3"><span className="sr-only">Delete</span></th>}</tr>
              </thead>
              <tbody>
                {bookings.map(item => (
                  <tr className="border-b border-[#eef2eb]" key={item.id}>
                    <td className="py-4"><strong>{item.name}</strong><br /><span className="text-xs text-slate-400">{item.phone}</span></td>
                    <td className="py-4">{item.service}</td>
                    <td className="py-4">
                      <span className="block text-xs text-slate-600">In {displayBookingTime(item.check_in_time, '11:00')} · Out {displayBookingTime(item.check_out_time, '10:00')}</span>
                      <button onClick={() => setTimeEditor({ id: item.id, name: item.name, checkInTime: item.check_in_time?.slice(0, 5) || '11:00', checkOutTime: item.check_out_time?.slice(0, 5) || '10:00' })} className="mt-1 flex items-center gap-1 text-[10px] text-[#315d4c] hover:underline"><Clock3 size={12} /> Set times</button>
                    </td>
                    <td className="py-4 text-xs text-slate-500">{item.check_in} → {item.check_out}</td>
                    <td className="py-4">₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="py-4">{item.paid ? <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">Paid</span> : (
                      <span className="flex flex-col items-start gap-1">
                        {(item.notes || '').includes('UPI claim') && <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-700" title={item.notes}>UPI claimed</span>}
                        <button onClick={() => markPaid(item)} className="rounded-full border border-[#b7c7b8] px-2 py-1 text-[10px] text-[#315d4c] hover:bg-[#e3eee1]">Mark paid</button>
                      </span>
                    )}</td>
                    <td className="py-4">
                      <select className="m-0 w-auto py-2 text-xs" value={item.status} onChange={e => updateBooking(item.id, e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="completed">Completed</option>
                      </select>
                    </td>
                    {canDelete && (
                      <td className="py-4">
                        <button onClick={() => deleteBooking(item.id)} title="Delete booking" className="rounded-full p-2 text-red-500 hover:bg-red-100"><Trash2 size={15} /></button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!bookings.length && <p className="py-8 text-center text-sm text-slate-400">New booking requests will appear here.</p>}
          </div>
        </section>}

        {timeEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/45 p-4" role="dialog" aria-modal="true" aria-labelledby="booking-times-title">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Booking schedule</p><h2 id="booking-times-title" className="mt-2 font-serif text-2xl">Set stay times</h2><p className="mt-1 text-sm text-slate-500">{timeEditor.name} · {timeEditor.id}</p></div><button onClick={() => setTimeEditor(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button></div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label>Check-in time<input type="time" value={timeEditor.checkInTime} onChange={e => setTimeEditor({ ...timeEditor, checkInTime: e.target.value })} /></label>
                <label>Check-out time<input type="time" value={timeEditor.checkOutTime} onChange={e => setTimeEditor({ ...timeEditor, checkOutTime: e.target.value })} /></label>
              </div>
              <p className="mt-3 text-xs text-slate-500">Standard timings are 11:00 AM check-in and 10:00 AM check-out. The saved times appear on the customer invoice.</p>
              <div className="mt-6 flex justify-end gap-3"><button className="button-outline" onClick={() => setTimeEditor(null)}>Cancel</button><button className="button-primary" onClick={saveBookingTimes} disabled={savingTimes}>{savingTimes ? 'Saving…' : <><Save size={15} /> Save times</>}</button></div>
            </div>
          </div>
        )}

        {canManageRoles && tab === 'customers' && (
          <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6">
            <div className="flex items-center gap-2"><Users size={18} /><p className="eyebrow">Team & customers</p></div>
            <h2 className="mt-2 font-serif text-2xl">Assign roles</h2>
            <p className="mt-1 text-sm text-slate-500">Promote a customer to staff, manager or super admin.</p>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
                  <tr><th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Phone</th><th className="pb-3">Role</th><th className="pb-3"><span className="sr-only">Remove role</span></th></tr>
                </thead>
                <tbody>
                  {customers.map(user => (
                    <tr className="border-b border-[#eef2eb]" key={user.id}>
                      <td className="py-3">{user.full_name || '—'}</td>
                      <td className="py-3">{user.email}</td>
                      <td className="py-3">{user.phone || '—'}</td>
                      <td className="py-3">
                        <select className="m-0 w-auto py-2 text-xs" value={user.role} onChange={e => changeRole(user.id, e.target.value)} disabled={user.id === rootAdminId}>
                          <option value="customer">Customer</option>
                          <option value="staff">Staff</option>
                          <option value="manager">Manager</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </td>
                      <td className="py-3">
                        {user.id === rootAdminId ? (
                          <span className="flex items-center gap-1 text-xs text-slate-400" title="The original super admin cannot be changed"><ShieldCheck size={14} /> Primary</span>
                        ) : user.role !== 'customer' ? (
                          <button onClick={() => removeRole(user.id)} title="Remove assigned role" className="rounded-full p-2 text-red-500 hover:bg-red-100"><Trash2 size={15} /></button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!customers.length && <p className="py-8 text-center text-sm text-slate-400">No users yet. Once someone signs up they'll appear here.</p>}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
