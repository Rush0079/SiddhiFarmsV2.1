import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { IMAGE_DEFAULTS } from '@/lib/siteImages'
import { sendBookingTermsEmail, sendPaidBookingEmails } from '@/lib/booking-email'
import { normaliseBookingTerms } from '@/lib/booking-terms'

const defaultPricing = { masterBedroom: 4500, villa2BHK: 9000, villa4BHK: 15000, oneDayTour: 700, miniWaterPark: 950, weddingEvent: 35000, engagementEvent: 18000, birthdayEvent: 12000, getTogetherEvent: 10000 }
const pricingKeys = Object.keys(defaultPricing)
// Core keys are always present; custom rates ride along in values with their labels under _labels.
function cleanPricing(values = {}) {
  const out = pricingKeys.reduce((r, k) => ({ ...r, [k]: Number(values[k] ?? defaultPricing[k]) }), {})
  const rawLabels = values._labels && typeof values._labels === 'object' ? values._labels : {}
  const labels = {}
  for (const [key, label] of Object.entries(rawLabels)) {
    if (pricingKeys.includes(key) || !/^[a-zA-Z0-9_]{1,40}$/.test(key)) continue
    labels[key] = String(label).slice(0, 60)
    out[key] = Number(values[key]) || 0
  }
  out._labels = labels
  return out
}

const serviceRateKey = {
  'Master Bedroom': 'masterBedroom',
  '2 BHK Villa': 'villa2BHK',
  '4 BHK Villa': 'villa4BHK',
  'Wedding Ceremony': 'weddingEvent',
  'Engagement Ceremony': 'engagementEvent',
  'Birthday Party': 'birthdayEvent',
  'Get Together': 'getTogetherEvent',
  'One Day Tour': 'oneDayTour',
  'Mini Water Park': 'miniWaterPark',
  'One Day Tour + Mini Water Park': 'miniWaterPark',
  'One Day Tour + Mini Adventure Park': 'oneDayTour',
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart)
}

async function requireRole(minRoles) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }
  const { data: profile } = await supabase.from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (!profile || !minRoles.includes(profile.role)) return { error: 'Forbidden', status: 403 }
  return { user, profile }
}

async function getImageOverrides(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'site_images').single()
  return data?.value && typeof data.value === 'object' ? data.value : {}
}

async function saveImageOverrides(admin, values) {
  return admin.from('settings').upsert({ key: 'site_images', value: values, updated_at: new Date().toISOString() })
}

async function getPaymentConfig(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'payment_config').single()
  const v = data?.value && typeof data.value === 'object' ? data.value : {}
  return { upiId: v.upiId || '', upiName: v.upiName || '', qrUrl: v.qrUrl || '' }
}

async function savePaymentConfig(admin, value) {
  return admin.from('settings').upsert({ key: 'payment_config', value, updated_at: new Date().toISOString() })
}

async function getBookingTerms(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'booking_terms').single()
  return normaliseBookingTerms(data?.value)
}

async function saveBookingTerms(admin, value) {
  return admin.from('settings').upsert({ key: 'booking_terms', value, updated_at: new Date().toISOString() })
}

async function sendPaymentConfirmation(admin, booking, paymentSource, recipients = {}) {
  try {
    const reportStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: last30DaysBookings, error } = await admin
      .from('bookings')
      .select('*')
      .gte('created_at', reportStart)
      .order('created_at', { ascending: false })
    if (error) throw error
    return await sendPaidBookingEmails({ booking, last30DaysBookings: last30DaysBookings || [booking], paymentSource, ...recipients })
  } catch (error) {
    // Payment is already recorded; never undo a valid payment if email delivery fails.
    console.error(`Payment email failed for ${booking.id}:`, error)
    return { sent: false, reason: 'delivery-failed' }
  }
}

// -----------------------------------------------------------------
// GET
// -----------------------------------------------------------------
export async function GET(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()

    if (path[0] === 'pricing') {
      const { data } = await admin.from('pricing').select('values').eq('id', 'current').single()
      return NextResponse.json(cleanPricing(data?.values))
    }

    if (path[0] === 'bookings' && path.length === 1) {
      const guard = await requireRole(['staff', 'manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { data } = await admin.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
      return NextResponse.json(data || [])
    }

    if (path[0] === 'coupons') {
      const { data } = await admin.from('coupons').select('*').order('created_at', { ascending: false })
      return NextResponse.json(data || [])
    }

    if (path[0] === 'images') {
      return NextResponse.json(await getImageOverrides(admin))
    }

    if (path[0] === 'payments' && path[1] === 'config') {
      return NextResponse.json(await getPaymentConfig(admin))
    }

    if (path[0] === 'booking-terms') {
      return NextResponse.json(await getBookingTerms(admin))
    }

    if (path[0] === 'admin' && path[1] === 'summary') {
      const { data: bookings } = await admin.from('bookings').select('status,amount')
      const { count: activeCoupons } = await admin.from('coupons').select('*', { count: 'exact', head: true }).eq('active', true)
      const list = bookings || []
      return NextResponse.json({
        bookings: list.length,
        pending: list.filter(i => i.status === 'pending').length,
        confirmed: list.filter(i => i.status === 'confirmed').length,
        revenue: list.reduce((s, i) => s + (Number(i.amount) || 0), 0),
        activeCoupons: activeCoupons || 0,
      })
    }

    if (path[0] === 'admin' && path[1] === 'customers') {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { data } = await admin.from('profiles').select('id, email, full_name, phone, role, created_at').order('created_at', { ascending: false })
      return NextResponse.json(data || [])
    }

    if (path[0] === 'me') {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ user: null })
      const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
      return NextResponse.json({ user, profile })
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('GET error', e)
    return NextResponse.json({ error: 'Unable to load resort data', details: e.message }, { status: 500 })
  }
}

// -----------------------------------------------------------------
// POST
// -----------------------------------------------------------------
export async function POST(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()

    // ---- Images: upload file to storage (multipart, must run before json parse) ----
    if (path[0] === 'images' && path[1] === 'upload') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const form = await request.formData()
      const file = form.get('file')
      const key = String(form.get('key') || '')
      if (!file || typeof file === 'string') return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
      if (!(key in IMAGE_DEFAULTS)) return NextResponse.json({ error: 'Unknown image slot' }, { status: 400 })
      if (!file.type?.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })

      await admin.storage.createBucket('site-images', { public: true }).catch(() => {})
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const objectPath = `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.${ext}`
      const bytes = Buffer.from(await file.arrayBuffer())
      const { error: upErr } = await admin.storage.from('site-images').upload(objectPath, bytes, { contentType: file.type, upsert: true })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      const { data: pub } = admin.storage.from('site-images').getPublicUrl(objectPath)

      const values = await getImageOverrides(admin)
      values[key] = pub.publicUrl
      const { error: setErr } = await saveImageOverrides(admin, values)
      if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })
      return NextResponse.json({ key, url: pub.publicUrl })
    }

    // ---- Payments: upload UPI QR image (multipart, must run before json parse) ----
    if (path[0] === 'payments' && path[1] === 'qr') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') return NextResponse.json({ error: 'QR image file is required' }, { status: 400 })
      if (!file.type?.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })

      await admin.storage.createBucket('site-images', { public: true }).catch(() => {})
      const ext = (file.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
      const objectPath = `payment-qr-${Date.now()}.${ext}`
      const bytes = Buffer.from(await file.arrayBuffer())
      const { error: upErr } = await admin.storage.from('site-images').upload(objectPath, bytes, { contentType: file.type, upsert: true })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      const { data: pub } = admin.storage.from('site-images').getPublicUrl(objectPath)

      const config = await getPaymentConfig(admin)
      config.qrUrl = pub.publicUrl
      const { error: setErr } = await savePaymentConfig(admin, config)
      if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })
      return NextResponse.json(config)
    }

    const body = await request.json().catch(() => ({}))

    // ---- Bookings: create (with real-time availability + coupon) ----
    if (path[0] === 'bookings') {
      if (!body.name || !body.email || !body.phone || !body.checkIn || !body.checkOut || !body.service)
        return NextResponse.json({ error: 'Please complete all required booking details' }, { status: 400 })
      if (body.termsAccepted !== true)
        return NextResponse.json({ error: 'You must accept the booking terms and conditions before continuing' }, { status: 400 })

      const checkIn = new Date(body.checkIn)
      const checkOut = new Date(body.checkOut)
      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()))
        return NextResponse.json({ error: 'Please provide valid check-in and check-out dates' }, { status: 400 })
      if (checkOut <= checkIn)
        return NextResponse.json({ error: 'Check out must be after check in' }, { status: 400 })

      // Overlap check
      const { data: existing } = await admin
        .from('bookings')
        .select('check_in, check_out')
        .eq('service', body.service)
        .in('status', ['pending', 'confirmed'])

      if ((existing || []).some(row => overlaps(body.checkIn, body.checkOut, row.check_in, row.check_out)))
        return NextResponse.json({ error: 'Those dates are no longer available for this accommodation' }, { status: 409 })

      // Pricing
      const { data: pricingRow } = await admin.from('pricing').select('values').eq('id', 'current').single()
      const rates = cleanPricing(pricingRow?.values)
      const rateKey = serviceRateKey[body.service]
      const nights = Math.max(1, Math.ceil((checkOut - checkIn) / 86400000))
      const subtotal = (rates[rateKey] || 0) * nights

      // Coupon
      let discount = 0
      let appliedCoupon = null
      if (body.couponCode) {
        const code = body.couponCode.trim().toUpperCase()
        const { data: coupon } = await admin.from('coupons').select('*').eq('code', code).eq('active', true).single()
        if (coupon && (!coupon.usage_limit || coupon.used < coupon.usage_limit) && (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) && subtotal >= (coupon.min_amount || 0)) {
          discount = coupon.type === 'fixed'
            ? Math.min(subtotal, Number(coupon.value))
            : Math.round(subtotal * Math.min(100, Number(coupon.value)) / 100)
          if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount)
          appliedCoupon = coupon.code
          await admin.from('coupons').update({ used: (coupon.used || 0) + 1 }).eq('id', coupon.id)
        }
      }

      // Attach user if signed in
      let userId = null
      try {
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) userId = user.id
      } catch {}

      const bookingId = `SFR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
      const amount = Math.max(0, subtotal - discount)
      const bookingTerms = await getBookingTerms(admin)
      const record = {
        id: bookingId,
        user_id: userId,
        name: body.name,
        email: body.email || null,
        phone: body.phone,
        service: body.service,
        check_in: body.checkIn,
        check_out: body.checkOut,
        guests: Number(body.guests) || 2,
        nights,
        subtotal,
        discount,
        amount,
        applied_coupon: appliedCoupon,
        terms_accepted_at: new Date().toISOString(),
        terms_version: bookingTerms.version,
        terms_content: bookingTerms.terms,
        status: 'pending',
      }
      const { error: insErr } = await admin.from('bookings').insert(record)
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

      const termsEmail = await sendBookingTermsEmail(record, bookingTerms)
      return NextResponse.json({ ...record, termsEmail }, { status: 201 })
    }

    // ---- Pricing update ----
    if (path[0] === 'pricing') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const values = cleanPricing(body)
      const { error } = await admin.from('pricing').upsert({ id: 'current', values, updated_at: new Date().toISOString() })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(values)
    }

    // ---- Booking terms: manager-editable terms shown to guests and emailed after acceptance ----
    if (path[0] === 'booking-terms') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const terms = Array.isArray(body.terms)
        ? body.terms.map(term => String(term || '').trim()).filter(Boolean).slice(0, 30)
        : []
      const version = String(body.version || '').trim().slice(0, 40)
      if (!version || !terms.length) return NextResponse.json({ error: 'Add a version and at least one term' }, { status: 400 })
      const value = { version, terms }
      const { error } = await saveBookingTerms(admin, value)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(value)
    }

    // ---- Coupons create ----
    if (path[0] === 'coupons') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      if (!body.code || !body.value) return NextResponse.json({ error: 'Coupon code and value are required' }, { status: 400 })
      const record = {
        code: body.code.trim().toUpperCase(),
        type: body.type || 'percentage',
        value: Number(body.value),
        active: true,
        usage_limit: Number(body.usageLimit) || 0,
        used: 0,
        min_amount: Number(body.minAmount) || 0,
        max_discount: body.maxDiscount ? Number(body.maxDiscount) : null,
        expires_at: body.expiresAt || null,
      }
      const { data, error } = await admin.from('coupons').insert(record).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data, { status: 201 })
    }

    // ---- Images: set/reset a slot URL ----
    if (path[0] === 'images') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const key = String(body.key || '')
      if (!(key in IMAGE_DEFAULTS)) return NextResponse.json({ error: 'Unknown image slot' }, { status: 400 })
      const url = String(body.url || '').trim()
      if (url && !/^(https?:\/\/|\/)/.test(url)) return NextResponse.json({ error: 'URL must start with http(s):// or /' }, { status: 400 })
      const values = await getImageOverrides(admin)
      if (url) values[key] = url
      else delete values[key]
      const { error } = await saveImageOverrides(admin, values)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ key, url: url || null })
    }

    // ---- Payments: save UPI config ----
    if (path[0] === 'payments' && path[1] === 'config') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const upiId = String(body.upiId ?? '').trim().slice(0, 80)
      if (upiId && !/^[\w.-]{2,}@[\w-]{2,}$/.test(upiId)) return NextResponse.json({ error: 'UPI ID should look like name@bank' }, { status: 400 })
      const config = await getPaymentConfig(admin)
      config.upiId = upiId
      config.upiName = String(body.upiName ?? '').trim().slice(0, 80)
      if ('qrUrl' in body) config.qrUrl = String(body.qrUrl || '').trim()
      const { error } = await savePaymentConfig(admin, config)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(config)
    }

    // ---- Payments: guest claims a manual UPI payment ----
    if (path[0] === 'payments' && path[1] === 'upi-claim') {
      const bookingId = String(body.bookingId || '')
      if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
      const { data: booking } = await admin.from('bookings').select('id, paid, notes').eq('id', bookingId).single()
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      if (booking.paid) return NextResponse.json({ error: 'This booking is already paid' }, { status: 409 })
      const reference = String(body.reference || '').replace(/[^\w /:-]/g, '').slice(0, 60)
      const note = `UPI claim ${new Date().toISOString()} · ref: ${reference || 'not provided'}`
      const notes = booking.notes ? `${booking.notes}\n${note}` : note
      const { error } = await admin.from('bookings').update({ notes }).eq('id', bookingId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, bookingId, status: 'pending-verification' })
    }

    // ---- Razorpay: create order ----
    if (path[0] === 'razorpay' && path[1] === 'order') {
      const { bookingId } = body
      if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
      const { data: booking } = await admin.from('bookings').select('*').eq('id', bookingId).single()
      if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
      const order = await rzp.orders.create({
        amount: booking.amount * 100, // paise
        currency: 'INR',
        receipt: booking.id,
        notes: { bookingId: booking.id, service: booking.service, guest: booking.name },
      })
      await admin.from('bookings').update({ razorpay_order_id: order.id }).eq('id', booking.id)
      return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, booking })
    }

    // ---- Razorpay: verify signature ----
    if (path[0] === 'razorpay' && path[1] === 'verify') {
      const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
      if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
        return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })

      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expected !== razorpay_signature)
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })

      const { data, error } = await admin.from('bookings').update({
        razorpay_payment_id,
        razorpay_signature,
        paid: true,
        status: 'confirmed',
      }).eq('id', bookingId).eq('paid', false).select().maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'This booking has already been marked as paid' }, { status: 409 })

      const email = await sendPaymentConfirmation(admin, data, 'Razorpay')
      return NextResponse.json({ ok: true, booking: data, email })
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('POST error', e)
    return NextResponse.json({ error: 'Unable to save resort data', details: e.message }, { status: 500 })
  }
}

// -----------------------------------------------------------------
// PATCH
// -----------------------------------------------------------------
export async function PATCH(request, { params }) {
  try {
    const path = (await params)?.path || []
    const body = await request.json().catch(() => ({}))
    const admin = supabaseAdmin()

    if (path[0] === 'bookings' && path[1]) {
      const guard = await requireRole(['staff', 'manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const patch = {}
      if (['pending', 'confirmed', 'cancelled', 'completed'].includes(body.status)) patch.status = body.status
      if (typeof body.paid === 'boolean') patch.paid = body.paid
      if ('checkInTime' in body) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.checkInTime))) return NextResponse.json({ error: 'Check-in time must use HH:MM format' }, { status: 400 })
        patch.check_in_time = body.checkInTime
      }
      if ('checkOutTime' in body) {
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.checkOutTime))) return NextResponse.json({ error: 'Check-out time must use HH:MM format' }, { status: 400 })
        patch.check_out_time = body.checkOutTime
      }
      if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
      if (body.paid === true && !patch.status) patch.status = 'confirmed'

      // Only the request that flips unpaid → paid sends an invoice. This keeps retries and
      // multiple admin clicks from sending the same confirmation more than once.
      if (body.paid === true) {
        const { data, error } = await admin.from('bookings').update(patch).eq('id', path[1]).eq('paid', false).select().maybeSingle()
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        if (!data) {
          const { data: current, error: currentError } = await admin.from('bookings').select('*').eq('id', path[1]).single()
          if (currentError || !current) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
          return NextResponse.json({ id: path[1], paid: current.paid, status: current.status, email: { sent: false, reason: 'already-paid' } })
        }
        const email = await sendPaymentConfirmation(admin, data, 'manual admin verification')
        return NextResponse.json({ ...data, email })
      }

      const { data: existing, error: existingError } = await admin.from('bookings').select('*').eq('id', path[1]).single()
      if (existingError || !existing) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const { data, error } = await admin.from('bookings').update(patch).eq('id', path[1]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      // A manual status confirmation may happen before payment; only owners are notified in that case.
      const email = body.status === 'confirmed' && existing.status !== 'confirmed'
        ? await sendPaymentConfirmation(admin, data, 'admin booking confirmation', { sendCustomer: false, sendOwners: true })
        : null
      return NextResponse.json({ ...data, email })
    }

    if (path[0] === 'coupons' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { error } = await admin.from('coupons').update({ active: Boolean(body.active) }).eq('id', path[1])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ id: path[1], active: Boolean(body.active) })
    }

    if (path[0] === 'admin' && path[1] === 'customers') {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { userId, role } = body
      if (!userId || !['customer', 'staff', 'manager', 'super_admin'].includes(role))
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      const { data: firstAdmin } = await admin.from('profiles').select('id').eq('role', 'super_admin').order('created_at', { ascending: true }).limit(1).single()
      if (firstAdmin?.id === userId) return NextResponse.json({ error: 'The original super admin role cannot be changed' }, { status: 403 })
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('PATCH error', e)
    return NextResponse.json({ error: 'Unable to update resort data', details: e.message }, { status: 500 })
  }
}

// -----------------------------------------------------------------
// DELETE
// -----------------------------------------------------------------
export async function DELETE(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()

    if (path[0] === 'coupons' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { error } = await admin.from('coupons').delete().eq('id', path[1])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: path[1] })
    }

    if (path[0] === 'bookings' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { error } = await admin.from('bookings').delete().eq('id', path[1])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: path[1] })
    }

    // ---- Remove an assigned role (back to customer); the original super admin is protected ----
    if (path[0] === 'admin' && path[1] === 'customers' && path[2]) {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { data: firstAdmin } = await admin.from('profiles').select('id').eq('role', 'super_admin').order('created_at', { ascending: true }).limit(1).single()
      if (firstAdmin?.id === path[2]) return NextResponse.json({ error: 'The original super admin role cannot be removed' }, { status: 403 })
      const { error } = await admin.from('profiles').update({ role: 'customer' }).eq('id', path[2])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, id: path[2], role: 'customer' })
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('DELETE error', e)
    return NextResponse.json({ error: 'Unable to delete resort data', details: e.message }, { status: 500 })
  }
}
