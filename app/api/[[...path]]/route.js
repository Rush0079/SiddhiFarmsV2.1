/**
 * ============================================================================
 * SIDDHI FARM RESORT - CENTRALIZED API ROUTE HANDLER
 * ============================================================================
 * 
 * DESIGN PATTERNS APPLIED:
 * 1. Front Controller / API Gateway Pattern:
 *    Acts as a unified entrance (`/api/[[...path]]`) routing REST operations,
 *    centralizing cross-cutting concerns (Rate-Limiting, RBAC, reCAPTCHA, Logging).
 * 
 * 2. Interceptor / Middleware Pipeline:
 *    Sequentially executes security checks (DDoS Sliding-Window Limit -> Bot Scoring -> JWT Auth -> RBAC).
 * 
 * 3. Strategy / Adapter Pattern:
 *    Multi-provider notification dispatch (WhatsApp/Email) and dual payment processing (Razorpay & UPI).
 * 
 * 4. Graceful Degradation / Fallback Pattern:
 *    Ensures robust defaults (Pricing, Terms, Images) even during database failover or initial setup.
 * 
 * LOGGING CONVENTION:
 * [API:<MODULE>:<ACTION>] <DETAILS> [STATUS]
 * ============================================================================
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { IMAGE_DEFAULTS } from '@/lib/siteImages'
import { sendPaidBookingEmails, sendAdminConfigAlert } from '@/lib/booking-email'
import { normaliseBookingTerms } from '@/lib/booking-terms'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendAutomatedWhatsAppMessage } from '@/lib/whatsapp'
import { verifyRecaptcha } from '@/lib/recaptcha'

/**
 * Standard fallback pricing matrix (in INR)
 */
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

/**
 * Sanitizes and merges dynamic pricing data with system defaults.
 * @param {Object} values - Raw pricing object from Supabase settings/pricing table.
 * @returns {Object} Normalized pricing object with validated numeric rates and custom labels.
 */
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

/**
 * Detects date overlap between two time intervals [aStart, aEnd] and [bStart, bEnd].
 */
function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart)
}

/**
 * Role-Based Access Control (RBAC) Guard Function.
 * Intercepts requests, validates JWT via Authorization header or SSR cookies, and asserts required role claim.
 * 
 * @param {string[]} minRoles - Array of authorized roles (e.g. ['staff', 'manager', 'super_admin'])
 * @param {Request} [req] - Incoming Next.js request object
 * @returns {Promise<{user?: Object, profile?: Object, error?: string, status?: number}>}
 */
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
      } catch (err) {
        console.warn('[API:AUTH:BEARER_WARN] Bearer token validation error:', err.message)
      }
    }
  }

  // 2. Check Cookie-Based JWT Session via Supabase SSR
  if (!user) {
    try {
      const supabase = await createSupabaseServerClient()
      const { data } = await supabase.auth.getUser()
      user = data?.user || null
    } catch (err) {
      console.warn('[API:AUTH:COOKIE_WARN] SSR cookie session fetch error:', err.message)
    }
  }

  if (!user) {
    console.warn('[API:AUTH:UNAUTHORIZED] Request denied: Missing or invalid JWT session')
    return { error: 'Unauthorized: Invalid or missing JWT session', status: 401 }
  }

  // 3. Query User Role & RBAC claims
  const admin = supabaseAdmin()
  const { data: profile } = await admin.from('profiles').select('role, full_name, email').eq('id', user.id).single()
  if (!profile || !minRoles.includes(profile.role)) {
    console.warn(`[API:AUTH:FORBIDDEN] User ${user.id} (${profile?.role || 'none'}) attempted access requiring [${minRoles.join(', ')}]`)
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

/**
 * Dispatches multi-channel booking notifications (Email HTML + Excel report + WhatsApp).
 * Implements resilient non-blocking dispatch so failures in messaging do not rollback payments.
 */
async function sendPaymentConfirmation(admin, booking, paymentSource, recipients = {}) {
  try {
    const enrichedBooking = enrichBookingWithAdvanceNotes(booking)
    console.log(`[API:NOTIFICATIONS:DISPATCH] Dispatching confirmations for booking ${booking.id} (${paymentSource})`)
    
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
      console.error(`[API:NOTIFICATIONS:WHATSAPP_ERROR] WhatsApp auto-dispatch error for ${booking.id}:`, err?.message || err)
    })

    const emailResult = await sendPaidBookingEmails({ booking: enrichedBooking, last30DaysBookings: enrichedBookings, paymentSource, ...recipients })
    console.log(`[API:NOTIFICATIONS:EMAIL_SUCCESS] Email sent for ${booking.id}`)
    return emailResult
  } catch (error) {
    // Payment is already recorded; never undo a valid payment if email delivery fails.
    console.error(`[API:NOTIFICATIONS:ERROR] Payment confirmation delivery failed for ${booking.id}:`, error?.message || error)
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

/**
 * GET Handler - Centralized Read Operations
 * Dispatches query requests based on URL path segments.
 * 
 * Endpoints:
 * - GET /api/pricing: Live dynamic pricing table
 * - GET /api/bookings: Admin booking list (Protected: staff/manager/super_admin)
 * - GET /api/coupons: Coupon list
 * - GET /api/advance-codes/validate?code=XYZ: Rate-limited advance deposit code validation
 * - GET /api/advance-codes: Admin advance code list (Protected: manager/super_admin)
 * - GET /api/bookings/public/:id: Public sanitized booking summary for balance payment / invoice
 * - GET /api/auth/me: Current authenticated session and role profile
 * - GET /api/images: Image CMS slot URLs
 * - GET /api/payments/config: Resort UPI ID, Merchant Name & QR URL
 * - GET /api/booking-terms: Versioned resort terms and conditions
 * - GET /api/admin/summary: Dashboard operational statistics
 * - GET /api/admin/customers: User profiles list (Protected: super_admin)
 * - GET /api/me: Supabase SSR session profile check
 */
export async function GET(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // 1. GET /api/pricing
    if (path[0] === 'pricing') {
      console.log('[API:PRICING:GET] Fetching active pricing schedule')
      const { data } = await admin.from('pricing').select('values').eq('id', 'current').single()
      return NextResponse.json(cleanPricing(data?.values))
    }

    // 2. GET /api/bookings (Admin list)
    if (path[0] === 'bookings' && path.length === 1) {
      const guard = await requireRole(['staff', 'manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      console.log(`[API:BOOKINGS:LIST] Admin ${guard.user.id} (${guard.profile.role}) fetching recent bookings`)
      const { data } = await admin.from('bookings').select('*').order('created_at', { ascending: false }).limit(200)
      return NextResponse.json((data || []).map(enrichBookingWithAdvanceNotes))
    }

    // 3. GET /api/coupons
    if (path[0] === 'coupons') {
      console.log('[API:COUPONS:GET] Fetching coupons list')
      const { data } = await admin.from('coupons').select('*').order('created_at', { ascending: false })
      return NextResponse.json(data || [])
    }

    // 4. GET /api/advance-codes
    if (path[0] === 'advance-codes') {
      if (path[1] === 'validate') {
        const clientIp = getClientIp(request)
        const limit = checkRateLimit(clientIp, 'advance_validate', 30, 60 * 1000)
        if (!limit.allowed) {
          console.warn(`[API:ADVANCE_CODES:RATE_LIMIT] IP ${clientIp} exceeded validate limit`)
          return NextResponse.json({ error: `Too many validation attempts. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
        }
        const url = new URL(request.url)
        const code = (url.searchParams.get('code') || '').trim().toUpperCase()
        if (!code) return NextResponse.json({ valid: false })
        const codes = await getAdvanceCodes(admin)
        const found = codes.find(c => c.code.toUpperCase() === code && c.active)
        console.log(`[API:ADVANCE_CODES:VALIDATE] Validating code "${code}" -> ${found ? 'VALID' : 'INVALID'}`)
        if (!found) return NextResponse.json({ valid: false })
        return NextResponse.json({ valid: true, code: found.code, percentage: found.percentage, fixedAmount: found.fixedAmount })
      }
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      console.log(`[API:ADVANCE_CODES:LIST] Manager ${guard.user.id} fetching all advance codes`)
      return NextResponse.json(await getAdvanceCodes(admin))
    }

    // 5. GET /api/bookings/public/:id
    if (path[0] === 'bookings' && path[1] === 'public' && path[2]) {
      const bookingId = path[2]
      console.log(`[API:BOOKINGS:GET_PUBLIC] Fetching public summary for booking ${bookingId}`)
      const { data: rawBooking, error } = await admin.from('bookings').select('*').eq('id', bookingId).single()
      if (error || !rawBooking) {
        console.warn(`[API:BOOKINGS:NOT_FOUND] Booking ${bookingId} not found`)
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
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

    // 6. GET /api/auth/me
    if (path[0] === 'auth' && path[1] === 'me') {
      const guard = await requireRole(['customer', 'staff', 'manager', 'super_admin'], request)
      if (guard.error) return NextResponse.json({ authenticated: false, error: guard.error }, { status: guard.status })
      console.log(`[API:AUTH:ME] Session verified for ${guard.user.email} (Role: ${guard.profile.role})`)
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

    // 7. GET /api/images
    if (path[0] === 'images') {
      console.log('[API:IMAGES:GET] Fetching image CMS configuration')
      return NextResponse.json(await getImageOverrides(admin))
    }

    // 8. GET /api/payments/config
    if (path[0] === 'payments' && path[1] === 'config') {
      console.log('[API:PAYMENTS:GET_CONFIG] Fetching UPI & payment configuration')
      return NextResponse.json(await getPaymentConfig(admin))
    }

    // 9. GET /api/booking-terms
    if (path[0] === 'booking-terms') {
      console.log('[API:TERMS:GET] Fetching resort booking terms')
      return NextResponse.json(await getBookingTerms(admin))
    }

    // 10. GET /api/admin/summary
    if (path[0] === 'admin' && path[1] === 'summary') {
      console.log('[API:ADMIN:SUMMARY] Generating operational dashboard metrics')
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

    // 11. GET /api/admin/customers
    if (path[0] === 'admin' && path[1] === 'customers') {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      console.log(`[API:ADMIN:CUSTOMERS] Super Admin ${guard.user.id} querying profiles table`)
      const { data } = await admin.from('profiles').select('id, email, full_name, phone, role, created_at').order('created_at', { ascending: false })
      return NextResponse.json(data || [])
    }

    // 12. GET /api/me
    if (path[0] === 'me') {
      const supabase = await createSupabaseServerClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ user: null })
      const { data: profile } = await admin.from('profiles').select('*').eq('id', user.id).single()
      return NextResponse.json({ user, profile })
    }

    // 13. GET /api/flash-sale (Fetch active flash sale campaign & schedule)
    if (path[0] === 'flash-sale') {
      const { data } = await admin.from('settings').select('value').eq('key', 'flash_sale').maybeSingle()
      const sale = data?.value || {
        enabled: false,
        name: '',
        badgeText: '⚡ FLASH SALE',
        discountType: 'percentage',
        discountValue: 0,
        startDateTime: '',
        endDateTime: '',
        bannerMessage: '',
        applicableServices: 'all',
        imageUrl: '',
      }
      const now = new Date()
      const start = sale.startDateTime ? new Date(sale.startDateTime) : null
      const end = sale.endDateTime ? new Date(sale.endDateTime) : null
      const isStartValid = start && !isNaN(start.getTime())
      const isEndValid = end && !isNaN(end.getTime())
      
      const isStarted = !isStartValid || now >= start
      const isEnded = isEndValid && now > end
      const isLive = Boolean(sale.enabled) && isStarted && !isEnded

      console.log(`[API:FLASH_SALE:GET] Flash sale query: ${isLive ? 'LIVE NOW' : 'INACTIVE'} (Enabled: ${sale.enabled})`)
      return NextResponse.json({
        active: isLive,
        sale: isLive ? sale : null,
        config: sale,
        serverTime: now.toISOString(),
      })
    }

    console.warn(`[API:ROUTING:NOT_FOUND] Unrecognized GET path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:GET:FATAL_ERROR]', e?.message || e)
    return NextResponse.json({ error: 'Unable to load resort data', details: e.message }, { status: 500 })
  }
}

/**
 * POST Handler - Centralized State Creation & Mutation Operations
 * 
 * Endpoints:
 * - POST /api/images/upload: Multipart image upload to Supabase storage bucket (Protected)
 * - POST /api/payments/qr: Multipart UPI QR code image upload (Protected)
 * - POST /api/advance-codes: Create single-use auto-expiring advance deposit code (Protected)
 * - POST /api/bookings: Strict server-side calculated booking creation with date overlap check
 * - POST /api/pricing: Update room & event rates matrix (Protected)
 * - POST /api/booking-terms: Update versioned house rules & terms (Protected)
 * - POST /api/coupons: Create discount promo coupon (Protected)
 * - POST /api/images: Override/reset image URL slot (Protected)
 * - POST /api/payments/config: Update UPI payment parameters (Protected)
 * - POST /api/payments/upi-claim: Guest submits transaction UTR/reference for manual audit
 * - POST /api/razorpay/order: Generate cryptographically signed Razorpay Order
 * - POST /api/razorpay/verify: Verify HMAC-SHA256 signature and commit confirmed booking
 * - POST /api/admin/create-user: Super admin provisioning of staff/manager accounts
 */
export async function POST(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // 1. POST /api/images/upload (Multipart image upload)
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

      console.log(`[API:IMAGES:UPLOAD] Uploading image for slot "${key}" by ${guard.user.id}`)
      await admin.storage.createBucket('site-images', { public: true }).catch(() => {})
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const objectPath = `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.${ext}`
      const bytes = Buffer.from(await file.arrayBuffer())
      const { error: upErr } = await admin.storage.from('site-images').upload(objectPath, bytes, { contentType: file.type, upsert: true })
      if (upErr) {
        console.error(`[API:IMAGES:UPLOAD_ERROR] Failed uploading slot "${key}":`, upErr.message)
        return NextResponse.json({ error: upErr.message }, { status: 500 })
      }
      const { data: pub } = admin.storage.from('site-images').getPublicUrl(objectPath)

      const values = await getImageOverrides(admin)
      values[key] = pub.publicUrl
      const { error: setErr } = await saveImageOverrides(admin, values)
      if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })
      console.log(`[API:IMAGES:UPLOAD_SUCCESS] Slot "${key}" set to ${pub.publicUrl}`)
      return NextResponse.json({ key, url: pub.publicUrl })
    }

    // 2. POST /api/payments/qr (Multipart QR upload)
    if (path[0] === 'payments' && path[1] === 'qr') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') return NextResponse.json({ error: 'QR image file is required' }, { status: 400 })
      if (!file.type?.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })

      console.log(`[API:PAYMENTS:QR_UPLOAD] Uploading custom UPI QR image by ${guard.user.id}`)
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
      console.log(`[API:PAYMENTS:QR_SUCCESS] UPI QR updated: ${pub.publicUrl}`)
      return NextResponse.json(config)
    }

    // 2.1 POST /api/flash-sale/upload (Multipart Flash Sale image / poster upload)
    if (path[0] === 'flash-sale' && path[1] === 'upload') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') return NextResponse.json({ error: 'Banner image file is required' }, { status: 400 })
      if (!file.type?.startsWith('image/')) return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
      if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })

      console.log(`[API:FLASH_SALE:IMAGE_UPLOAD] Uploading promotional banner by ${guard.user.id}`)
      await admin.storage.createBucket('site-images', { public: true }).catch(() => {})
      const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
      const objectPath = `flash-sale-banner-${Date.now()}.${ext}`
      const bytes = Buffer.from(await file.arrayBuffer())
      const { error: upErr } = await admin.storage.from('site-images').upload(objectPath, bytes, { contentType: file.type, upsert: true })
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      const { data: pub } = admin.storage.from('site-images').getPublicUrl(objectPath)

      return NextResponse.json({ url: pub.publicUrl })
    }

    const body = await request.json().catch(() => ({}))

    // 3. POST /api/advance-codes
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
      console.log(`[API:ADVANCE_CODES:CREATED] Code "${code}" (${percentage ? `${percentage}%` : `₹${fixedAmount}`}) created by ${guard.user.id}`)
      return NextResponse.json(newEntry, { status: 201 })
    }

    // 4. POST /api/bookings (Create booking)
    if (path[0] === 'bookings') {
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'create_booking', 10, 5 * 60 * 1000)
      if (!limit.allowed) {
        console.warn(`[API:BOOKINGS:RATE_LIMIT] IP ${clientIp} exceeded booking creation limit`)
        return NextResponse.json({ error: `Too many booking requests. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
      }

      // Google reCAPTCHA v3 verification
      const recaptchaToken = body.recaptchaToken || body.recaptcha_token
      const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'booking_submit')
      if (!recaptchaResult.success) {
        console.warn(`[API:BOOKINGS:RECAPTCHA_FAILED] IP ${clientIp} failed bot score verification`)
        return NextResponse.json({ error: recaptchaResult.error || 'Security verification failed. Please try again.' }, { status: 403 })
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
        if (checkOut < checkIn)
          return NextResponse.json({ error: 'Check-out date must be on or after check-in date' }, { status: 400 })
      } else {
        if (checkOut <= checkIn)
          return NextResponse.json({ error: 'Check-out must be after check-in date' }, { status: 400 })
      }

      // Overlap check
      const { data: existing } = await admin
        .from('bookings')
        .select('check_in, check_out')
        .eq('service', body.service)
        .in('status', ['pending', 'confirmed'])

      if ((existing || []).some(row => overlaps(body.checkIn, body.checkOut, row.check_in, row.check_out))) {
        console.warn(`[API:BOOKINGS:OVERLAP_CONFLICT] Overlap detected for ${body.service} (${body.checkIn} to ${body.checkOut})`)
        return NextResponse.json({ error: 'Those dates are no longer available for this accommodation/event' }, { status: 409 })
      }

      // Pricing - Strict server-side calculation
      const { data: pricingRow } = await admin.from('pricing').select('values').eq('id', 'current').single()
      const rates = cleanPricing(pricingRow?.values)
      const rateKey = serviceRateKey[body.service]
      const guests = Math.max(1, Math.min(200, Number(body.guests) || 1))
      const rawNights = Math.ceil((checkOut - checkIn) / 86400000)
      const nights = isSingleDayBooking ? 1 : Math.max(1, rawNights)

      let subtotal = 0
      if (isShortStay) {
        const shortKey = serviceShortStayRateKey[body.service]
        subtotal = (shortKey && rates[shortKey]) ? Number(rates[shortKey]) : Math.round((rates[rateKey] || 0) * 0.5)
      } else if (isEventService) {
        subtotal = (rates[rateKey] || 0)
      } else if (isDayTourService) {
        subtotal = (rates[rateKey] || 0) * guests
      } else {
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

      // Coupon application
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

          // Strict Single-Use Auto-Delete: purge immediately
          allAdvCodes.splice(advIdx, 1)
          await saveAdvanceCodes(admin, allAdvCodes)
          console.log(`[API:ADVANCE_CODES:BURNED] Code "${appliedAdvanceCode}" redeemed and purged`)
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
      const sanitizedName = String(body.name || '').trim().replace(/[<>]/g, '').slice(0, 80)
      const sanitizedEmail = String(body.email || '').trim().toLowerCase().slice(0, 100)
      const sanitizedPhone = String(body.phone || '').trim().replace(/[^\d+ -]/g, '').slice(0, 20)

      const record = {
        id: bookingId,
        user_id: userId,
        name: sanitizedName,
        email: sanitizedEmail || null,
        phone: sanitizedPhone,
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
      if (insErr) {
        console.error(`[API:BOOKINGS:INSERT_ERROR] Failed saving ${bookingId}:`, insErr.message)
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }

      console.log(`[API:BOOKINGS:CREATED] Booking ${bookingId} initialized for ${sanitizedName} (Amount: ₹${chargeAmount})`)
      return NextResponse.json(record, { status: 201 })
    }

    // 5. POST /api/pricing
    if (path[0] === 'pricing') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const values = cleanPricing(body)
      const { error } = await admin.from('pricing').upsert({ id: 'current', values, updated_at: new Date().toISOString() })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      console.log(`[API:PRICING:UPDATED] Pricing updated by ${guard.user.id}`)

      sendAdminConfigAlert({
        category: 'Pricing Matrix',
        action: 'Room & Package Rates Updated',
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: values,
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json(values)
    }

    // 6. POST /api/booking-terms
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
      console.log(`[API:TERMS:UPDATED] Terms updated to version "${version}" by ${guard.user.id}`)

      sendAdminConfigAlert({
        category: 'Booking Terms & Rules',
        action: `Resort Terms Updated (Version: ${version})`,
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: {
          'Version': version,
          'Total Terms': `${terms.length} clauses`,
          'Summary': terms.slice(0, 4).join(' | '),
        },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json(value)
    }

    // 7. POST /api/coupons
    if (path[0] === 'coupons') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      if (!body.code || !body.value) return NextResponse.json({ error: 'Coupon code and value are required' }, { status: 400 })
      const cleanCode = body.code.trim().toUpperCase()

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
      console.log(`[API:COUPONS:CREATED] Coupon "${cleanCode}" created by ${guard.user.id}`)

      sendAdminConfigAlert({
        category: 'Coupons & Promotions',
        action: `Promo Coupon Created: ${cleanCode}`,
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: {
          'Coupon Code': cleanCode,
          'Discount Type': record.type,
          'Discount Value': record.type === 'percentage' ? `${record.value}%` : `₹${record.value}`,
          'Usage Limit': record.usage_limit || 'Unlimited',
          'Min Order Amount': `₹${record.min_amount}`,
          'Expiry': record.expires_at ? new Date(record.expires_at).toLocaleDateString('en-IN') : 'No Expiry',
        },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json(data, { status: 201 })
    }

    // 8. POST /api/images (Set/reset slot URL)
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
      console.log(`[API:IMAGES:OVERRIDE] Slot "${key}" updated by ${guard.user.id}`)
      return NextResponse.json({ key, url: url || null })
    }

    // 9. POST /api/payments/config (Save UPI config)
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
      console.log(`[API:PAYMENTS:CONFIG_SAVED] Payment settings updated by ${guard.user.id}`)

      sendAdminConfigAlert({
        category: 'Payments & Settlement',
        action: 'UPI / Direct Payment Configuration Updated',
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: {
          'UPI ID': config.upiId || 'Not set',
          'Payee Name': config.upiName || 'Not set',
          'QR Image': config.qrUrl ? 'Custom QR Code Active' : 'Default / None',
        },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json(config)
    }

    // 10. POST /api/payments/upi-claim (Guest submits UPI reference)
    if (path[0] === 'payments' && path[1] === 'upi-claim') {
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'upi_claim', 10, 5 * 60 * 1000)
      if (!limit.allowed) {
        console.warn(`[API:PAYMENTS:CLAIM_RATE_LIMIT] IP ${clientIp} exceeded UPI claim limit`)
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
      console.log(`[API:PAYMENTS:UPI_CLAIM_RECORDED] Booking ${bookingId} marked with ref: ${reference}`)
      return NextResponse.json({ ok: true, bookingId, status: 'pending-verification' })
    }

    // 11. POST /api/razorpay/order
    if (path[0] === 'razorpay' && path[1] === 'order') {
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'razorpay_order', 15, 5 * 60 * 1000)
      if (!limit.allowed) {
        console.warn(`[API:RAZORPAY:ORDER_RATE_LIMIT] IP ${clientIp} exceeded order creation limit`)
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
      console.log(`[API:RAZORPAY:ORDER_CREATED] Order ${order.id} generated for booking ${booking.id} (₹${payAmount})`)
      return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, booking, payAmount })
    }

    // 12. POST /api/razorpay/verify
    if (path[0] === 'razorpay' && path[1] === 'verify') {
      const clientIp = getClientIp(request)
      const limit = checkRateLimit(clientIp, 'razorpay_verify', 20, 5 * 60 * 1000)
      if (!limit.allowed) {
        console.warn(`[API:RAZORPAY:VERIFY_RATE_LIMIT] IP ${clientIp} exceeded verify limit`)
        return NextResponse.json({ error: `Too many verification requests. Please try again in ${limit.resetInSeconds}s.` }, { status: 429 })
      }

      const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, type } = body
      if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
        return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })

      const expected = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex')

      if (expected !== razorpay_signature) {
        console.error(`[API:RAZORPAY:SIGNATURE_MISMATCH] Cryptographic verification failed for booking ${bookingId}`)
        return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
      }

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

      // Atomically commit coupon usage
      if (existing.applied_coupon && !isBalance) {
        const { data: cp } = await admin.from('coupons').select('id, used').eq('code', existing.applied_coupon).single()
        if (cp) {
          await admin.from('coupons').update({ used: (cp.used || 0) + 1 }).eq('id', cp.id)
        }
      }

      const enriched = enrichBookingWithAdvanceNotes(data)
      console.log(`[API:RAZORPAY:VERIFY_SUCCESS] Payment confirmed for ${bookingId} (${razorpay_payment_id})`)
      const email = await sendPaymentConfirmation(admin, enriched, isBalance ? 'Razorpay (Balance settlement)' : 'Razorpay')
      return NextResponse.json({ ok: true, booking: enriched, email })
    }

/**
 * Validates password complexity requirements:
 * - Minimum 10 characters length
 * - At least one uppercase letter (A-Z)
 * - At least one numeric digit (0-9)
 * - At least one special character (!@#$%^&* etc.)
 * @param {string} password - Raw candidate password
 * @returns {string|null} Error string if invalid, null if valid
 */
function validatePasswordComplexity(password) {
  if (!password || typeof password !== 'string') return 'Password is required.'
  if (password.length < 10) return 'Password must be at least 10 characters long.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter (A-Z).'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit (0-9).'
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return 'Password must contain at least one special character (e.g. !@#$%^&*).'
  }
  return null
}

    // 13. POST /api/admin/create-user (super_admin only: provision staff & manager accounts)
    if (path[0] === 'admin' && path[1] === 'create-user') {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

      const { name, email, password, role, phone } = body
      if (!name || !email || !password)
        return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })

      // Enforce strict password complexity: min 10 chars, 1 uppercase, 1 digit, 1 special char
      const pwError = validatePasswordComplexity(password)
      if (pwError) return NextResponse.json({ error: pwError }, { status: 400 })

      // Enforce single Super Admin architecture: only staff & manager accounts can be created
      if (!['staff', 'manager'].includes(role)) {
        return NextResponse.json({
          error: 'Invalid role. New accounts can only be created as Staff or Manager. The primary Super Admin is unique.',
        }, { status: 400 })
      }

      console.log(`[API:ADMIN:CREATE_USER] Provisioning new team user ${email} with role "${role}" by Super Admin ${guard.user.id}`)
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: name.trim() },
      })
      if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

      await admin.from('profiles').upsert({
        id: newUser.user.id,
        email: email.trim().toLowerCase(),
        full_name: name.trim(),
        phone: phone?.trim() || null,
        role,
        updated_at: new Date().toISOString(),
      })

      sendAdminConfigAlert({
        category: 'User Management',
        action: `New Team Member Created: ${email}`,
        changedBy: guard.user.email,
        role: 'super_admin',
        details: {
          'Full Name': name.trim(),
          'Email': email.trim().toLowerCase(),
          'Assigned Role': role,
          'Phone': phone?.trim() || '—',
        },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json({ ok: true, id: newUser.user.id, email: newUser.user.email, role }, { status: 201 })
    }

    // 14. POST /api/flash-sale (Save/schedule promotional flash sale campaign)
    if (path[0] === 'flash-sale') {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

      const saleConfig = {
        enabled: Boolean(body.enabled),
        name: String(body.name || '').trim(),
        badgeText: String(body.badgeText || '⚡ FLASH SALE').trim(),
        discountType: body.discountType === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(body.discountValue) || 0,
        startDateTime: body.startDateTime || '',
        endDateTime: body.endDateTime || '',
        bannerMessage: String(body.bannerMessage || '').trim(),
        applicableServices: Array.isArray(body.applicableServices) ? body.applicableServices : 'all',
        imageUrl: String(body.imageUrl || '').trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: guard.user.email,
      }

      const { error } = await admin.from('settings').upsert({
        key: 'flash_sale',
        value: saleConfig,
        updated_at: new Date().toISOString(),
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      console.log(`[API:FLASH_SALE:SAVED] Flash sale updated by ${guard.user.email} (Enabled: ${saleConfig.enabled}, Value: ${saleConfig.discountValue} ${saleConfig.discountType}, Image: ${saleConfig.imageUrl ? 'Yes' : 'No'})`)

      sendAdminConfigAlert({
        category: 'Flash Sale & Campaigns',
        action: saleConfig.enabled ? 'Flash Sale Activated / Scheduled' : 'Flash Sale Disabled',
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: {
          'Status': saleConfig.enabled ? '🟢 Active / Scheduled' : '🔴 Disabled',
          'Campaign Title': saleConfig.name || 'Flash Sale',
          'Offer': saleConfig.discountType === 'percentage' ? `${saleConfig.discountValue}% OFF` : `₹${saleConfig.discountValue} Flat Off`,
          'Start Time': saleConfig.startDateTime ? new Date(saleConfig.startDateTime).toLocaleString('en-IN') : 'Immediately',
          'End Time': saleConfig.endDateTime ? new Date(saleConfig.endDateTime).toLocaleString('en-IN') : 'Indefinite',
          'Applicable Stays': Array.isArray(saleConfig.applicableServices) ? saleConfig.applicableServices.join(', ') : 'All Services',
          'Banner Poster': saleConfig.imageUrl ? 'Custom Poster Uploaded' : 'Default / None',
          'Banner Text': saleConfig.bannerMessage || '—',
        },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json({ ok: true, sale: saleConfig })
    }

    console.warn(`[API:ROUTING:NOT_FOUND] Unrecognized POST path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:POST:FATAL_ERROR]', e?.message || e)
    return NextResponse.json({ error: 'Unable to save resort data', details: e.message }, { status: 500 })
  }
}

/**
 * PATCH Handler - State Modification & Settlement Operations
 * 
 * Endpoints:
 * - PATCH /api/bookings/:id: Update booking status, arrival/departure timings, or manual payment clearance
 * - PATCH /api/coupons/:id: Activate / Deactivate a coupon code
 * - PATCH /api/admin/customers: Change customer role (Protected: super_admin)
 */
export async function PATCH(request, { params }) {
  try {
    const path = (await params)?.path || []
    const body = await request.json().catch(() => ({}))
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // 1. PATCH /api/bookings/:id
    if (path[0] === 'bookings' && path[1]) {
      const guard = await requireRole(['staff', 'manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const bookingId = path[1]
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
      if (!Object.keys(patch).length && !body.markBalance) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
      if (body.paid === true && !patch.status) patch.status = 'confirmed'

      console.log(`[API:BOOKINGS:PATCH] Updating booking ${bookingId} by ${guard.user.id} (${guard.profile.role})`, patch)

      // Manual clearance of remaining balance
      if (body.markBalance === true) {
        const { data: rawExisting } = await admin.from('bookings').select('*').eq('id', bookingId).single()
        if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        const existing = enrichBookingWithAdvanceNotes(rawExisting)
        const total = Number(existing.total_amount || (Number(existing.amount || 0) + Number(existing.pending_amount || 0)))
        let { data, error } = await admin.from('bookings').update({
          paid: true,
          paid_amount: total,
          pending_amount: 0,
          payment_status: 'full',
          status: 'confirmed',
        }).eq('id', bookingId).select().single()
        if (error) {
          const updatedNotes = (existing.notes || '').replace(/Pending Balance:\s*₹\d+/i, 'Pending Balance: ₹0 (Cleared)')
          const fallbackRes = await admin.from('bookings').update({ paid: true, status: 'confirmed', notes: updatedNotes }).eq('id', bookingId).select().single()
          if (fallbackRes.error) return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
          data = fallbackRes.data
        }
        const enriched = enrichBookingWithAdvanceNotes(data)
        console.log(`[API:BOOKINGS:BALANCE_CLEARED] Booking ${bookingId} balance cleared manually`)
        const email = await sendPaymentConfirmation(admin, enriched, 'Manual balance clearance')
        return NextResponse.json({ ...enriched, email })
      }

      // Idempotent unpaid -> paid transition
      if (body.paid === true) {
        const { data: rawExisting } = await admin.from('bookings').select('*').eq('id', bookingId).single()
        if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        const existing = enrichBookingWithAdvanceNotes(rawExisting)

        const updatePayload = {
          ...patch,
          paid_amount: existing.amount,
          pending_amount: existing.pending_amount,
          total_amount: existing.total_amount,
          payment_status: existing.pending_amount > 0 ? 'advance' : 'full',
        }

        let { data, error } = await admin.from('bookings').update(updatePayload).eq('id', bookingId).eq('paid', false).select().maybeSingle()
        if (error) {
          const fallbackRes = await admin.from('bookings').update(patch).eq('id', bookingId).eq('paid', false).select().maybeSingle()
          if (fallbackRes.error) return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
          data = fallbackRes.data
        }
        if (!data) {
          const { data: current, error: currentError } = await admin.from('bookings').select('*').eq('id', bookingId).single()
          if (currentError || !current) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
          return NextResponse.json({ id: bookingId, paid: current.paid, status: current.status, email: { sent: false, reason: 'already-paid' } })
        }
        if (existing.applied_coupon) {
          const { data: cp } = await admin.from('coupons').select('id, used').eq('code', existing.applied_coupon).single()
          if (cp) {
            await admin.from('coupons').update({ used: (cp.used || 0) + 1 }).eq('id', cp.id)
          }
        }
        const enriched = enrichBookingWithAdvanceNotes(data)
        console.log(`[API:BOOKINGS:MANUAL_PAID_CONFIRMED] Booking ${bookingId} verified as paid by admin`)
        const email = await sendPaymentConfirmation(admin, enriched, 'manual admin verification')
        return NextResponse.json({ ...enriched, email })
      }

      const { data: rawExisting, error: existingError } = await admin.from('bookings').select('*').eq('id', bookingId).single()
      if (existingError || !rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      const existing = enrichBookingWithAdvanceNotes(rawExisting)
      const { data, error } = await admin.from('bookings').update(patch).eq('id', bookingId).select().single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const enriched = enrichBookingWithAdvanceNotes(data)
      
      const email = body.status === 'confirmed' && existing.status !== 'confirmed'
        ? await sendPaymentConfirmation(admin, enriched, 'admin booking confirmation', { sendCustomer: false, sendOwners: true })
        : null
      return NextResponse.json({ ...enriched, email })
    }

    // 2. PATCH /api/coupons/:id
    if (path[0] === 'coupons' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { error } = await admin.from('coupons').update({ active: Boolean(body.active) }).eq('id', path[1])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      console.log(`[API:COUPONS:TOGGLE] Coupon ${path[1]} active state set to ${Boolean(body.active)}`)

      sendAdminConfigAlert({
        category: 'Coupons & Promotions',
        action: `Coupon Status Changed to ${Boolean(body.active) ? 'Active' : 'Inactive'}`,
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: {
          'Coupon ID': path[1],
          'Status': Boolean(body.active) ? '🟢 Active' : '🔴 Inactive',
        },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json({ id: path[1], active: Boolean(body.active) })
    }

    // 3. PATCH /api/admin/customers (Role updates: customer, staff, or manager)
    if (path[0] === 'admin' && path[1] === 'customers') {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { userId, role } = body
      if (!userId || !['customer', 'staff', 'manager'].includes(role))
        return NextResponse.json({ error: 'Invalid role. Roles can only be updated to customer, staff, or manager.' }, { status: 400 })
      const { data: firstAdmin } = await admin.from('profiles').select('id').eq('role', 'super_admin').order('created_at', { ascending: true }).limit(1).single()
      if (firstAdmin?.id === userId) return NextResponse.json({ error: 'The primary super admin account role cannot be changed' }, { status: 403 })
      const { error } = await admin.from('profiles').update({ role }).eq('id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      console.log(`[API:ADMIN:ROLE_CHANGED] User ${userId} updated to role "${role}" by Super Admin ${guard.user.id}`)

      sendAdminConfigAlert({
        category: 'User Management',
        action: `User Role Changed to "${role}"`,
        changedBy: guard.user.email,
        role: 'super_admin',
        details: {
          'Target User ID': userId,
          'New Role': role,
        },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json({ ok: true })
    }

    console.warn(`[API:ROUTING:NOT_FOUND] Unrecognized PATCH path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:PATCH:FATAL_ERROR]', e?.message || e)
    return NextResponse.json({ error: 'Unable to update resort data', details: e.message }, { status: 500 })
  }
}

/**
 * DELETE Handler - Resource Deletion Operations
 * 
 * Endpoints:
 * - DELETE /api/advance-codes/:id: Delete an advance code (Protected: manager/super_admin)
 * - DELETE /api/coupons/:id: Delete a coupon (Protected: manager/super_admin)
 * - DELETE /api/bookings/:id: Delete a booking (Protected: manager/super_admin)
 * - DELETE /api/admin/customers/:id: Revoke admin role or permanently delete user account (Protected: super_admin)
 */
export async function DELETE(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // 1. DELETE /api/advance-codes/:id
    if (path[0] === 'advance-codes' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const codes = await getAdvanceCodes(admin)
      const nextCodes = codes.filter(c => c.id !== path[1] && c.code !== path[1])
      await saveAdvanceCodes(admin, nextCodes)
      console.log(`[API:ADVANCE_CODES:DELETED] Advance code ${path[1]} deleted by ${guard.user.id}`)

      sendAdminConfigAlert({
        category: 'Advance Deposit Codes',
        action: `Advance Code Deleted: ${path[1]}`,
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: { 'Deleted Code ID': path[1] },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json({ ok: true, id: path[1] })
    }

    // 2. DELETE /api/coupons/:id
    if (path[0] === 'coupons' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { error } = await admin.from('coupons').delete().eq('id', path[1])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      console.log(`[API:COUPONS:DELETED] Coupon ${path[1]} deleted by ${guard.user.id}`)

      sendAdminConfigAlert({
        category: 'Coupons & Promotions',
        action: `Coupon Permanently Deleted (ID: ${path[1]})`,
        changedBy: guard.user.email,
        role: guard.user.role || 'manager',
        details: { 'Deleted Coupon ID': path[1] },
      }).catch(err => console.error('[ALERT:ERROR]', err))

      return NextResponse.json({ ok: true, id: path[1] })
    }

    // 3. DELETE /api/bookings/:id
    if (path[0] === 'bookings' && path[1]) {
      const guard = await requireRole(['manager', 'super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const { error } = await admin.from('bookings').delete().eq('id', path[1])
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      console.log(`[API:BOOKINGS:DELETED] Booking ${path[1]} deleted by ${guard.user.id}`)
      return NextResponse.json({ ok: true, id: path[1] })
    }

    // 4. DELETE /api/admin/customers/:id (Role revocation or permanent user deletion)
    if (path[0] === 'admin' && path[1] === 'customers' && path[2]) {
      const guard = await requireRole(['super_admin'])
      if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })
      const targetUserId = path[2]
      const { data: firstAdmin } = await admin.from('profiles').select('id').eq('role', 'super_admin').order('created_at', { ascending: true }).limit(1).single()
      if (firstAdmin?.id === targetUserId) return NextResponse.json({ error: 'The primary super admin account cannot be modified or deleted' }, { status: 403 })

      const url = new URL(request.url)
      const isPermanentDelete = url.searchParams.get('deleteUser') === 'true'

      if (isPermanentDelete) {
        await admin.from('profiles').delete().eq('id', targetUserId)
        const { error: authErr } = await admin.auth.admin.deleteUser(targetUserId)
        if (authErr) console.warn(`[API:ADMIN:AUTH_DELETE_WARN] User delete warning for ${targetUserId}:`, authErr.message)
        console.log(`[API:ADMIN:USER_PURGED] User ${targetUserId} permanently deleted by Super Admin ${guard.user.id}`)

        sendAdminConfigAlert({
          category: 'User Management',
          action: `User Account Permanently Deleted`,
          changedBy: guard.user.email,
          role: 'super_admin',
          details: { 'Deleted User ID': targetUserId },
        }).catch(err => console.error('[ALERT:ERROR]', err))

        return NextResponse.json({ ok: true, id: targetUserId, deleted: true })
      } else {
        const { error } = await admin.from('profiles').update({ role: 'customer' }).eq('id', targetUserId)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        console.log(`[API:ADMIN:ROLE_REVOKED] User ${targetUserId} demoted to customer role by Super Admin ${guard.user.id}`)

        sendAdminConfigAlert({
          category: 'User Management',
          action: `User Demoted to Regular Customer`,
          changedBy: guard.user.email,
          role: 'super_admin',
          details: { 'Demoted User ID': targetUserId },
        }).catch(err => console.error('[ALERT:ERROR]', err))

        return NextResponse.json({ ok: true, id: targetUserId, role: 'customer' })
      }
    }

    console.warn(`[API:ROUTING:NOT_FOUND] Unrecognized DELETE path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:DELETE:FATAL_ERROR]', e?.message || e)
    return NextResponse.json({ error: 'Unable to delete resort data', details: e.message }, { status: 500 })
  }
}

