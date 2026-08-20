import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { IMAGE_DEFAULTS } from '@/lib/siteImages'
import { sendPaidBookingEmails } from '@/lib/booking-email'
import { normaliseBookingTerms } from '@/lib/booking-terms'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendAutomatedWhatsAppMessage } from '@/lib/whatsapp'

const defaultPricing = {
  masterBedroom: 4500,
  villa2BHK: 9000,
  villa4BHK: 15000,
  masterBedroomShortStay: 2500,
  villa2BHKShortStay: 5000,
  villa4BHKShortStay: 8000,
  oneDayTour: 700,
  miniWaterPark: 950,
  weddingEvent: 35000,
  engagementEvent: 18000,
  birthdayEvent: 12000,
  getTogetherEvent: 10000,
}
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

const serviceShortStayRateKey = {
  'Master Bedroom': 'masterBedroomShortStay',
  '2 BHK Villa': 'villa2BHKShortStay',
  '4 BHK Villa': 'villa4BHKShortStay',
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart)
}

async function requireRole(minRoles, req = null) {
  let user = null

  // 1. Check Authorization Bearer Header (JWT Token)
  const authHeader = req?.headers?.get ? (req.headers.get('authorization') || '') : ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (token) {
      try {
        const admin = supabaseAdmin()
        const { data, error } = await admin.auth.getUser(token)
        if (data?.user && !error) {
          user = data.user
        }
      } catch {}
    }
  }

  // 2. Check Cookie-Based JWT Session via Supabase SSR
  if (!user) {
    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      user = data?.user || null
    } catch {}
  }

  if (!user) return { error: 'Unauthorized: Invalid or missing JWT session', status: 401 }

  // 3. Query User Role & RBAC claims
  const admin = supabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (!profile || !minRoles.includes(profile.role)) {
    return { error: 'Forbidden: Insufficient role permissions', status: 403 }
  }

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

async function getAdvanceCodes(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'advance_codes').single()
  return Array.isArray(data?.value) ? data.value : []
}

async function saveAdvanceCodes(admin, value) {
  return admin.from('settings').upsert({ key: 'advance_codes', value, updated_at: new Date().toISOString() })
}

async function sendPaymentConfirmation(admin, booking, paymentSource, recipients = {}) {
  try {
    const enrichedBooking = enrichBookingWithAdvanceNotes(booking)
    const reportStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: last30DaysBookings, error } = await admin
      .from('bookings')
      .select('*')
      .gte('created_at', reportStart)
      .order('created_at', { ascending: false })
    if (error) throw error
    const enrichedBookings = (last30DaysBookings || [enrichedBooking]).map(enrichBookingWithAdvanceNotes)

    // Trigger automated background WhatsApp message delivery alongside email
    sendAutomatedWhatsAppMessage(enrichedBooking).catch(err => {
      console.error(`WhatsApp auto-dispatch error for ${booking.id}:`, err?.message || err)
    })

    return await sendPaidBookingEmails({ booking: enrichedBooking, last30DaysBookings: enrichedBookings, paymentSource, ...recipients })
  } catch (error) {
    // Payment is already recorded; never undo a valid payment if email delivery fails.
    console.error(`Payment confirmation delivery failed for ${booking.id}:`, error)
    return { sent: false, reason: 'delivery-failed' }
  }
}

function enrichBookingWithAdvanceNotes(booking) {
  if (!booking) return booking
  let pendingAmount = Number(booking.pending_amount || 0)
  let totalAmount = Number(booking.total_amount || 0)
  let paidAmount = Number(booking.paid_amount || 0)
  let paymentStatus = booking.payment_status || (booking.paid ? (pendingAmount > 0 ? 'advance' : 'full') : 'unpaid')
  let advanceCode = booking.advance_code || null

  // If custom columns were fallback-saved into notes
  if (!pendingAmount && booking.notes && booking.notes.includes('Pending Balance: ₹')) {
    const matchPending = booking.notes.match(/Pending Balance:\s*₹(\d+)/i)
    const matchDeposit = booking.notes.match(/Advance Deposit:\s*₹(\d+)/i)
    const matchCode = booking.notes.match(/Code:\s*([A-Z0-9_-]+)/i)
    if (matchPending) pendingAmount = Number(matchPending[1])
    if (matchDeposit) {
      const deposit = Number(matchDeposit[1])
      if (!totalAmount) totalAmount = deposit + pendingAmount
      if (booking.paid && !paidAmount) paidAmount = deposit
    }
    if (matchCode && !advanceCode) advanceCode = matchCode[1]
  }

  // If booking is paid and paid_amount is 0 or missing, set paidAmount to amount (deposit or full)
  if (booking.paid && !paidAmount) {
    paidAmount = Number(booking.amount || 0)
  }

  if (!totalAmount) {
    totalAmount = Number(booking.amount || 0) + pendingAmount
  }

  if (booking.paid) {
    paymentStatus = pendingAmount > 0 ? 'advance' : 'full'
  } else if (!paymentStatus || paymentStatus === 'unpaid') {
    paymentStatus = pendingAmount > 0 ? 'advance' : 'unpaid'
  }

  return {
    ...booking,
    pending_amount: pendingAmount,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    payment_status: paymentStatus,
    advance_code: advanceCode,
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
      return NextResponse.json((data || []).map(enrichBookingWithAdvanceNotes))
    }

    if (path[0] === 'coupons') {
      const { data } = await admin.from('coupons').select('*').order('created_at', { ascending: false })
      return NextResponse.json(data || [])
    }

    if (path[0] === 'advance-codes') {
      if (path[1] === 'validate') {
        const clientIp = getClientIp(request)
        const limit = checkRateLimit(clientIp, 'advance_validate', 30, 60 * 1000)
        if (!limit.allowed) {
          return NextResponse.json({ error: `Too many validation attempts. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
        }
        const url = new URL(request.url)
        const code = (url.searchParams.get('code') || '').trim().toUpperCase()
        if (!code) return NextResponse.json({ valid: false })
        const codes = await getAdvanceCodes(admin)
        const found = codes.find(c => c.code.toUpperCase() === code && c.active)
        if (!found) return NextResponse.json({ valid: false })
        return NextResponse.json({ valid: true, code: found.code, percentage: found.percentage, fixedAmount: found.fixedAmount })
      }
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      return NextResponse.json(await getAdvanceCodes(admin))
    }

    if (path[0] === 'bookings' && path[1] === 'public' && path[2]) {
      const { data: rawBooking, error } = await admin.from('bookings').select('*').eq('id', path[2]).single()
      if (error || !rawBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const booking = enrichBookingWithAdvanceNotes(rawBooking)
      return NextResponse.json({
        id: booking.id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        service: booking.service,
        check_in: booking.check_in,
        check_out: booking.check_out,
        check_in_time: booking.check_in_time,
        check_out_time: booking.check_out_time,
        guests: booking.guests,
        nights: booking.nights,
        amount: booking.amount,
        total_amount: booking.total_amount,
        paid_amount: booking.paid_amount,
        pending_amount: booking.pending_amount,
        paid: booking.paid,
        payment_status: booking.payment_status,
        status: booking.status,
      })
    }

    if (path[0] === 'auth' && path[1] === 'me') {
      const guard = await requireRole(['customer', 'staff', 'manager', 'super_admin'], request)
      if (guard.error) return NextResponse.json({ authenticated: false, error: guard.error }, { status: guard.status })
      return NextResponse.json({
        authenticated: true,
        user: {
          id: guard.user.id,
          email: guard.user.email,
          role: guard.profile.role,
          full_name: guard.profile.full_name,
        },
      })
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

    // ---- Advance Codes: create single-use advance code ----
    if (path[0] === 'advance-codes') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
      if (!code || code.length < 3) return NextResponse.json({ error: 'Code must be at least 3 characters' }, { status: 400 })
      const percentage = body.percentage !== undefined && body.percentage !== null && body.percentage !== '' ? Number(body.percentage) : (body.fixedAmount ? null : 50)
      const fixedAmount = body.fixedAmount ? Number(body.fixedAmount) : null
      const codes = await getAdvanceCodes(admin)
      if (codes.some(c => c.code === code)) return NextResponse.json({ error: 'Code already exists' }, { status: 400 })
      const newEntry = {
        id: crypto.randomUUID(),
        code,
        percentage: percentage !== null ? Math.min(100, Math.max(1, percentage)) : null,
        fixedAmount: fixedAmount ? Math.max(1, fixedAmount) : null,
        active: true,
        usageLimit: 1,
        used: 0,
        createdAt: new Date().toISOString(),
      }
      codes.unshift(newEntry)
      await saveAdvanceCodes(admin, codes)
      return NextResponse.json(newEntry, { status: 201 })
    }

    // ---- Bookings: create (with real-time availability + coupon + advance code) ----
    if (path[0] === 'bookings') {
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'create_booking', 10, 5 * 60 * 1000)
      if (!limit.allowed) {
        return NextResponse.json({ error: `Too many booking requests. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
      }

      if (!body.name || !body.email || !body.phone || !body.checkIn || !body.checkOut || !body.service)
        return NextResponse.json({ error: 'Please complete all required booking details' }, { status: 400 })
      if (body.termsAccepted !== true)
        return NextResponse.json({ error: 'You must accept the booking terms and conditions before continuing' }, { status: 400 })

      const rawAadhaar = String(body.aadhaarNumber || body.aadhaar_number || body.aadhaar || '').replace(/\D/g, '')
      if (rawAadhaar && rawAadhaar.length !== 12)
        return NextResponse.json({ error: 'Aadhaar number must be 12 digits' }, { status: 400 })
      const formattedAadhaar = rawAadhaar ? rawAadhaar.replace(/(\d{4})(?=\d)/g, '$1 ') : null

      const checkIn = new Date(body.checkIn)
      const checkOut = new Date(body.checkOut)
      const today = new Date(); today.setHours(0, 0, 0, 0)

      if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()))
        return NextResponse.json({ error: 'Please provide valid check-in and check-out dates' }, { status: 400 })
      if (checkIn < today || checkOut < today)
        return NextResponse.json({ error: 'Past dates are not allowed. Please select today or a future date.' }, { status: 400 })
      
      // Determine booking classification
      const eventServices = ['Engagement Ceremony', 'Birthday Party', 'Get Together', 'Wedding Ceremony']
      const dayTourServices = ['One Day Tour', 'Mini Water Park', 'One Day Tour + Mini Water Park', 'One Day Tour + Mini Adventure Park']
      const isEventService = eventServices.includes(body.service)
      const isDayTourService = dayTourServices.includes(body.service)
      const isShortStay = Boolean(body.isShortStay || body.stayType === 'short_stay')
      const isSingleDayBooking = isEventService || isDayTourService || isShortStay

      if (isSingleDayBooking) {
        // For events, day tours, and 4-5 hour short stays, check-out can be on the same date
        if (checkOut < checkIn)
          return NextResponse.json({ error: 'Check-out date must be on or after check-in date' }, { status: 400 })
      } else {
        // For multi-day stays, check-out must be after check-in
        if (checkOut <= checkIn)
          return NextResponse.json({ error: 'Check-out must be after check-in date' }, { status: 400 })
      }

      // Overlap check
      const { data: existing } = await admin
        .from('bookings')
        .select('check_in, check_out')
        .eq('service', body.service)
        .in('status', ['pending', 'confirmed'])

      if ((existing || []).some(row => overlaps(body.checkIn, body.checkOut, row.check_in, row.check_out)))
        return NextResponse.json({ error: 'Those dates are no longer available for this accommodation/event' }, { status: 409 })

      // Pricing - Strict server-side calculation
      const { data: pricingRow } = await admin.from('pricing').select('values').eq('id', 'current').single()
      const rates = cleanPricing(pricingRow?.values)
      const rateKey = serviceRateKey[body.service]
      const guests = Math.max(1, Math.min(200, Number(body.guests) || 1))
      const rawNights = Math.ceil((checkOut - checkIn) / 86400000)
      const nights = isSingleDayBooking ? 1 : Math.max(1, rawNights)

      let subtotal = 0
      if (isShortStay) {
        // Admin-managed short stay rate (or fallback to 50% of overnight rate)
        const shortKey = serviceShortStayRateKey[body.service]
        subtotal = (shortKey && rates[shortKey]) ? Number(rates[shortKey]) : Math.round((rates[rateKey] || 0) * 0.5)
      } else if (isEventService) {
        // Flat 1-day event ceremony package
        subtotal = (rates[rateKey] || 0)
      } else if (isDayTourService) {
        // Per-person day tour/water park
        subtotal = (rates[rateKey] || 0) * guests
      } else {
        // Overnight stay
        subtotal = (rates[rateKey] || 0) * nights
      }

      // Default slot timings
      let checkInTime = body.checkInTime || null
      let checkOutTime = body.checkOutTime || null

      if (!checkInTime || !checkOutTime) {
        if (isShortStay) {
          checkInTime = checkInTime || '10:00'
          checkOutTime = checkOutTime || '15:00'
        } else if (isEventService) {
          checkInTime = checkInTime || (body.service === 'Birthday Party' ? '16:00' : '09:00')
          checkOutTime = checkOutTime || (body.service === 'Birthday Party' ? '22:00' : '21:00')
        } else if (isDayTourService) {
          checkInTime = checkInTime || '09:30'
          checkOutTime = checkOutTime || '18:00'
        } else {
          checkInTime = checkInTime || '11:00'
          checkOutTime = checkOutTime || '10:00'
        }
      }

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
          // Note: coupon.used is committed upon successful payment verification, so failed checkouts do not burn customer coupons!
        }
      }

      // Check for Advance Code (single-use auto-delete)
      let isAdvanceBooking = false
      let appliedAdvanceCode = null
      let depositAmount = 0
      let pendingBalance = 0
      const passedAdvCode = String(body.advanceCode || body.couponCode || '').trim().toUpperCase()
      if (passedAdvCode) {
        const allAdvCodes = await getAdvanceCodes(admin)
        const advIdx = allAdvCodes.findIndex(c => c.code.toUpperCase() === passedAdvCode && c.active)
        if (advIdx !== -1) {
          const adv = allAdvCodes[advIdx]
          const netTotal = Math.max(0, subtotal - discount)
          depositAmount = adv.percentage !== null && adv.percentage !== undefined
            ? Math.round(netTotal * Math.min(100, Number(adv.percentage)) / 100)
            : Math.min(netTotal, Number(adv.fixedAmount || 0))
          depositAmount = Math.max(1, depositAmount)
          pendingBalance = Math.max(0, netTotal - depositAmount)
          isAdvanceBooking = true
          appliedAdvanceCode = adv.code

          // Strict Single-Use Auto-Delete: purge immediately so it can never be used again!
          allAdvCodes.splice(advIdx, 1)
          await saveAdvanceCodes(admin, allAdvCodes)
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
      const totalBill = Math.max(0, subtotal - discount)
      const chargeAmount = isAdvanceBooking ? depositAmount : totalBill
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
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        guests: Number(body.guests) || 2,
        nights,
        subtotal,
        discount,
        amount: chargeAmount,
        total_amount: totalBill,
        paid_amount: 0,
        pending_amount: isAdvanceBooking ? pendingBalance : 0,
        payment_status: isAdvanceBooking ? 'advance' : 'unpaid',
        advance_code: appliedAdvanceCode,
        applied_coupon: appliedCoupon,
        aadhaar_number: formattedAadhaar,
        notes: isShortStay ? `Short Stay (${checkInTime} to ${checkOutTime})` : (isEventService ? `Event: ${body.service} (${checkInTime} to ${checkOutTime})` : null),
        terms_accepted_at: new Date().toISOString(),
        terms_version: bookingTerms.version,
        terms_content: bookingTerms.terms,
        status: 'pending',
      }
      let { error: insErr } = await admin.from('bookings').insert(record)
      if (insErr) {
        // Fallback if custom columns don't exist yet in Supabase schema
        const fallbackRecord = { ...record }
        delete fallbackRecord.total_amount
        delete fallbackRecord.paid_amount
        delete fallbackRecord.pending_amount
        delete fallbackRecord.payment_status
        delete fallbackRecord.advance_code
        delete fallbackRecord.aadhaar_number

        const noteParts = []
        if (record.aadhaar_number) noteParts.push(`Aadhaar: ${record.aadhaar_number}`)
        if (isAdvanceBooking) noteParts.push(`Advance Deposit: ₹${depositAmount} | Pending Balance: ₹${pendingBalance} (Code: ${appliedAdvanceCode})`)
        if (noteParts.length) {
          fallbackRecord.notes = fallbackRecord.notes ? `${fallbackRecord.notes}\n${noteParts.join('\n')}` : noteParts.join('\n')
        }
        const fallbackRes = await admin.from('bookings').insert(fallbackRecord)
        insErr = fallbackRes.error
      }
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

      return NextResponse.json(record, { status: 201 })
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
      const cleanCode = body.code.trim().toUpperCase()

      // Check for duplicate code
      const { data: existingCoupon } = await admin.from('coupons').select('id, code').eq('code', cleanCode).maybeSingle()
      if (existingCoupon) {
        return NextResponse.json({ error: `Coupon code "${cleanCode}" already exists. You can delete the existing one or use a different code.` }, { status: 400 })
      }

      const record = {
        code: cleanCode,
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
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'upi_claim', 10, 5 * 60 * 1000)
      if (!limit.allowed) {
        return NextResponse.json({ error: `Too many claim attempts. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
      }
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
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'razorpay_order', 15, 5 * 60 * 1000)
      if (!limit.allowed) {
        return NextResponse.json({ error: `Too many payment requests. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
      }

      const { bookingId, type } = body
      if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
      const { data: rawBooking } = await admin.from('bookings').select('*').eq('id', bookingId).single()
      if (!rawBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const booking = enrichBookingWithAdvanceNotes(rawBooking)

      const isBalance = type === 'balance'
      const payAmount = isBalance ? (Number(booking.pending_amount) || Number(booking.amount)) : Number(booking.amount)
      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
      const order = await rzp.orders.create({
        amount: Math.round(payAmount * 100), // paise
        currency: 'INR',
        receipt: `${booking.id}${isBalance ? '-BAL' : ''}`,
        notes: { bookingId: booking.id, service: booking.service, guest: booking.name, type: isBalance ? 'balance' : 'initial' },
      })
      await admin.from('bookings').update({ razorpay_order_id: order.id }).eq('id', booking.id)
      return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, booking, payAmount })
    }

    // ---- Razorpay: verify signature ----
    if (path[0] === 'razorpay' && path[1] === 'verify') {
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'razorpay_verify', 20, 5 * 60 * 1000)
      if (!limit.allowed) {
        return NextResponse.json({ error: `Too many verification requests. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
      }

      const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, type } = body
      if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
        return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })

      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expected !== razorpay_signature)
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })

      const { data: rawExisting } = await admin.from('bookings').select('*').eq('id', bookingId).single()
      if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const existing = enrichBookingWithAdvanceNotes(rawExisting)

      const isBalance = type === 'balance' || (existing.pending_amount > 0 && existing.paid)
      const totalAmount = Number(existing.total_amount || (Number(existing.amount || 0) + Number(existing.pending_amount || 0)))

      const updateData = isBalance ? {
        razorpay_payment_id,
        razorpay_signature,
        paid: true,
        paid_amount: totalAmount,
        pending_amount: 0,
        payment_status: 'full',
        status: 'confirmed',
      } : {
        razorpay_payment_id,
        razorpay_signature,
        paid: true,
        paid_amount: existing.amount,
        pending_amount: existing.pending_amount,
        total_amount: totalAmount,
        payment_status: existing.pending_amount > 0 ? 'advance' : 'full',
        status: 'confirmed',
      }

      let { data, error } = await admin.from('bookings').update(updateData).eq('id', bookingId).select().single()
      if (error) {
        const fallbackUpdate = {
          razorpay_payment_id,
          razorpay_signature,
          paid: true,
          status: 'confirmed',
        }
        if (isBalance) {
          const updatedNotes = (existing.notes || '').replace(/Pending Balance:\s*₹\d+/i, 'Pending Balance: ₹0 (Cleared)')
          fallbackUpdate.notes = updatedNotes
        }
        const fallbackRes = await admin.from('bookings').update(fallbackUpdate).eq('id', bookingId).select().single()
        if (fallbackRes.error) return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
        data = fallbackRes.data
      }

      // Atomically commit coupon usage now that payment is confirmed
      if (existing.applied_coupon && !isBalance) {
        const { data: cp } = await admin.from('coupons').select('id, used').eq('code', existing.applied_coupon).single()
        if (cp) {
          await admin.from('coupons').update({ used: (cp.used || 0) + 1 }).eq('id', cp.id)
        }
      }

      const enriched = enrichBookingWithAdvanceNotes(data)
      const email = await sendPaymentConfirmation(admin, enriched, isBalance ? 'Razorpay (Balance settlement)' : 'Razorpay')
      return NextResponse.json({ ok: true, booking: enriched, email })
    }

    // ---- Admin: create new admin user (super_admin only) ----
    if (path[0] === 'admin' && path[1] === 'create-user') {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

      const { name, email, password, role, phone } = body
      if (!name || !email || !password)
        return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
      if (password.length < 8)
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      if (!['staff', 'manager', 'super_admin'].includes(role))
        return NextResponse.json({ error: 'Role must be staff, manager or super_admin' }, { status: 400 })

      // Create user in Supabase Auth
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: name.trim() },
      })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

      // Upsert profile with the assigned role
      await admin.from('profiles').upsert({
        id: newUser.user.id,
        email: email.trim().toLowerCase(),
        full_name: name.trim(),
        phone: phone?.trim() || null,
        role,
        updated_at: new Date().toISOString(),
      })

      return NextResponse.json({ ok: true, id: newUser.user.id, email: newUser.user.email, role }, { status: 201 })
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

      if (body.markBalance === true) {
        const { data: rawExisting } = await admin.from('bookings').select('*').eq('id', path[1]).single()
        if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        const existing = enrichBookingWithAdvanceNotes(rawExisting)
        const total = Number(existing.total_amount || (Number(existing.amount || 0) + Number(existing.pending_amount || 0)))
        let { data, error } = await admin.from('bookings').update({
          paid: true,
          paid_amount: total,
          pending_amount: 0,
          payment_status: 'full',
          status: 'confirmed',
        }).eq('id', path[1]).select().single()
        if (error) {
          const updatedNotes = (existing.notes || '').replace(/Pending Balance:\s*₹\d+/i, 'Pending Balance: ₹0 (Cleared)')
          const fallbackRes = await admin.from('bookings').update({ paid: true, status: 'confirmed', notes: updatedNotes }).eq('id', path[1]).select().single()
          if (fallbackRes.error) return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
          data = fallbackRes.data
        }
        const enriched = enrichBookingWithAdvanceNotes(data)
        const email = await sendPaymentConfirmation(admin, enriched, 'Manual balance clearance')
        return NextResponse.json({ ...enriched, email })
      }

      // Only the request that flips unpaid → paid sends an invoice. This keeps retries and
      // multiple admin clicks from sending the same confirmation more than once.
      if (body.paid === true) {
        const { data: rawExisting } = await admin.from('bookings').select('*').eq('id', path[1]).single()
        if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        const existing = enrichBookingWithAdvanceNotes(rawExisting)

        const updatePayload = {
          ...patch,
          paid_amount: existing.amount,
          pending_amount: existing.pending_amount,
          total_amount: existing.total_amount,
          payment_status: existing.pending_amount > 0 ? 'advance' : 'full',
        }

        let { data, error } = await admin.from('bookings').update(updatePayload).eq('id', path[1]).eq('paid', false).select().maybeSingle()
        if (error) {
          const fallbackRes = await admin.from('bookings').update(patch).eq('id', path[1]).eq('paid', false).select().maybeSingle()
          if (fallbackRes.error) return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
          data = fallbackRes.data
        }
        if (!data) {
          const { data: current, error: currentError } = await admin.from('bookings').select('*').eq('id', path[1]).single()
          if (currentError || !current) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
          return NextResponse.json({ id: path[1], paid: current.paid, status: current.status, email: { sent: false, reason: 'already-paid' } })
        }
        if (existing.applied_coupon) {
          const { data: cp } = await admin.from('coupons').select('id, used').eq('code', existing.applied_coupon).single()
          if (cp) {
            await admin.from('coupons').update({ used: (cp.used || 0) + 1 }).eq('id', cp.id)
          }
        }
        const enriched = enrichBookingWithAdvanceNotes(data)
        const email = await sendPaymentConfirmation(admin, enriched, 'manual admin verification')
        return NextResponse.json({ ...enriched, email })
      }

      const { data: rawExisting, error: existingError } = await admin.from('bookings').select('*').eq('id', path[1]).single()
      if (existingError || !rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const existing = enrichBookingWithAdvanceNotes(rawExisting)
      const { data, error } = await admin.from('bookings').update(patch).eq('id', path[1]).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const enriched = enrichBookingWithAdvanceNotes(data)
      // A manual status confirmation may happen before payment; only owners are notified in that case.
      const email = body.status === 'confirmed' && existing.status !== 'confirmed'
        ? await sendPaymentConfirmation(admin, enriched, 'admin booking confirmation', { sendCustomer: false, sendOwners: true })
        : null
      return NextResponse.json({ ...enriched, email })
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

    if (path[0] === 'advance-codes' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const codes = await getAdvanceCodes(admin)
      const nextCodes = codes.filter(c => c.id !== path[1] && c.code !== path[1])
      await saveAdvanceCodes(admin, nextCodes)
      return NextResponse.json({ ok: true, id: path[1] })
    }

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

    // ---- Remove an assigned role or delete user account (super_admin only, primary admin protected) ----
    if (path[0] === 'admin' && path[1] === 'customers' && path[2]) {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { data: firstAdmin } = await admin.from('profiles').select('id').eq('role', 'super_admin').order('created_at', { ascending: true }).limit(1).single()
      if (firstAdmin?.id === path[2]) return NextResponse.json({ error: 'The primary super admin account cannot be modified or deleted' }, { status: 403 })

      const url = new URL(request.url)
      const isPermanentDelete = url.searchParams.get('deleteUser') === 'true'

      if (isPermanentDelete) {
        await admin.from('profiles').delete().eq('id', path[2])
        const { error: authErr } = await admin.auth.admin.deleteUser(path[2])
        if (authErr) console.warn(`Auth user delete warning for ${path[2]}:`, authErr.message)
        return NextResponse.json({ ok: true, id: path[2], deleted: true })
      } else {
        const { error } = await admin.from('profiles').update({ role: 'customer' }).eq('id', path[2])
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true, id: path[2], role: 'customer' })
      }
    }

    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('DELETE error', e)
    return NextResponse.json({ error: 'Unable to delete resort data', details: e.message }, { status: 500 })
  }
}
