/**
 * ============================================================================
 * API SECURITY GUARDS & SHARED DOMAIN UTILITIES
 * ============================================================================
 *
 * @fileoverview  Provides reusable API gateway middleware functions:
 *                1. Role-Based Access Control (RBAC) authorization guard (`requireRole`)
 *                2. Fallback pricing normalizer & matrix constants (`cleanPricing`)
 *                3. Calendar date overlap detector (`overlaps`)
 *                4. Multi-channel confirmation dispatcher (Email, WhatsApp)
 *                5. Advance deposit note parser (`enrichBookingWithAdvanceNotes`)
 *                6. Database settings helpers (Images, Payments, Terms, Advance Codes)
 *
 * @module        lib/api/guards
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { normaliseBookingTerms } from '@/lib/booking-terms'
import { sendPaidBookingEmails } from '@/lib/booking-email'
import { sendAutomatedWhatsAppMessage } from '@/lib/whatsapp'

/**
 * Standard fallback pricing matrix (in INR)
 * @type {Record<string, number>}
 */
export const DEFAULT_PRICING = {
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

export const PRICING_KEYS = Object.keys(DEFAULT_PRICING)

export const SERVICE_RATE_KEYS = {
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

export const SERVICE_SHORT_STAY_RATE_KEYS = {
  'Master Bedroom': 'masterBedroomShortStay',
  '2 BHK Villa': 'villa2BHKShortStay',
  '4 BHK Villa': 'villa4BHKShortStay',
}

/**
 * Sanitizes and merges dynamic pricing data with system defaults.
 *
 * @param {Object} values - Raw pricing object from Supabase settings/pricing table.
 * @returns {Object} Normalized pricing object with validated numeric rates and custom labels.
 */
export function cleanPricing(values = {}) {
  const out = PRICING_KEYS.reduce(
    (r, k) => ({ ...r, [k]: Number(values[k] ?? DEFAULT_PRICING[k]) }),
    {}
  )
  const rawLabels = values._labels && typeof values._labels === 'object' ? values._labels : {}
  const labels = {}
  for (const [key, label] of Object.entries(rawLabels)) {
    if (PRICING_KEYS.includes(key) || !/^[a-zA-Z0-9_]{1,40}$/.test(key)) continue
    labels[key] = String(label).slice(0, 60)
    out[key] = Number(values[key]) || 0
  }
  out._labels = labels
  return out
}

/**
 * Detects date overlap between two time intervals [aStart, aEnd] and [bStart, bEnd].
 *
 * @param {string|Date} aStart
 * @param {string|Date} aEnd
 * @param {string|Date} bStart
 * @param {string|Date} bEnd
 * @returns {boolean} True if intervals overlap.
 */
export function overlaps(aStart, aEnd, bStart, bEnd) {
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
export async function requireRole(minRoles, req = null) {
  let user = null

  // 1. Check Authorization Bearer Header (JWT Token)
  const authHeader = req?.headers?.get ? req.headers.get('authorization') || '' : ''
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
  const { data: profile } = await admin
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || !minRoles.includes(profile.role)) {
    console.warn(
      `[API:AUTH:FORBIDDEN] User ${user.id} (${profile?.role || 'none'}) attempted access requiring [${minRoles.join(', ')}]`
    )
    return { error: 'Forbidden: Insufficient role permissions', status: 403 }
  }

  return { user, profile }
}

// ─── SETTINGS ACCESSORS & HELPERS ───────────────────────────────────────────

export async function getImageOverrides(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'site_images').single()
  return data?.value && typeof data.value === 'object' ? data.value : {}
}

export async function saveImageOverrides(admin, values) {
  return admin
    .from('settings')
    .upsert({ key: 'site_images', value: values, updated_at: new Date().toISOString() })
}

export async function getPaymentConfig(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'payment_config').single()
  const v = data?.value && typeof data.value === 'object' ? data.value : {}
  return { upiId: v.upiId || '', upiName: v.upiName || '', qrUrl: v.qrUrl || '' }
}

export async function savePaymentConfig(admin, value) {
  return admin
    .from('settings')
    .upsert({ key: 'payment_config', value, updated_at: new Date().toISOString() })
}

export async function getBookingTerms(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'booking_terms').single()
  return normaliseBookingTerms(data?.value)
}

export async function saveBookingTerms(admin, value) {
  return admin
    .from('settings')
    .upsert({ key: 'booking_terms', value, updated_at: new Date().toISOString() })
}

export async function getAdvanceCodes(admin) {
  const { data } = await admin.from('settings').select('value').eq('key', 'advance_codes').single()
  return Array.isArray(data?.value) ? data.value : []
}

export async function saveAdvanceCodes(admin, value) {
  return admin
    .from('settings')
    .upsert({ key: 'advance_codes', value, updated_at: new Date().toISOString() })
}

/**
 * Dispatches multi-channel booking notifications (Email HTML + Excel report + WhatsApp).
 * Implements resilient non-blocking dispatch so failures in messaging do not rollback payments.
 */
export async function sendPaymentConfirmation(admin, booking, paymentSource, recipients = {}) {
  try {
    const enrichedBooking = enrichBookingWithAdvanceNotes(booking)
    console.log(
      `[API:NOTIFICATIONS:DISPATCH] Dispatching confirmations for booking ${booking.id} (${paymentSource})`
    )

    const reportStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: last30DaysBookings, error } = await admin
      .from('bookings')
      .select('*')
      .gte('created_at', reportStart)
      .order('created_at', { ascending: false })
    if (error) throw error
    const enrichedBookings = (last30DaysBookings || [enrichedBooking]).map(
      enrichBookingWithAdvanceNotes
    )

    // Trigger automated background WhatsApp message delivery alongside email
    sendAutomatedWhatsAppMessage(enrichedBooking).catch((err) => {
      console.error(
        `[API:NOTIFICATIONS:WHATSAPP_ERROR] WhatsApp auto-dispatch error for ${booking.id}:`,
        err?.message || err
      )
    })

    const emailResult = await sendPaidBookingEmails({
      booking: enrichedBooking,
      last30DaysBookings: enrichedBookings,
      paymentSource,
      ...recipients,
    })
    console.log(`[API:NOTIFICATIONS:EMAIL_SUCCESS] Email sent for ${booking.id}`)
    return emailResult
  } catch (error) {
    console.error(
      `[API:NOTIFICATIONS:ERROR] Payment confirmation delivery failed for ${booking.id}:`,
      error?.message || error
    )
    return { sent: false, reason: 'delivery-failed' }
  }
}

export function enrichBookingWithAdvanceNotes(booking) {
  if (!booking) return booking
  let pendingAmount = Number(booking.pending_amount || 0)
  let totalAmount = Number(booking.total_amount || 0)
  let paidAmount = Number(booking.paid_amount || 0)
  let paymentStatus =
    booking.payment_status ||
    (booking.paid ? (pendingAmount > 0 ? 'advance' : 'full') : 'unpaid')
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

  // If booking is paid and paid_amount is 0 or missing, set paidAmount to amount
  if (booking.paid && !paidAmount) {
    paidAmount = Number(booking.amount || 0)
  }
  if (!totalAmount) {
    totalAmount = paidAmount + pendingAmount
  }

  return {
    ...booking,
    total_amount: totalAmount,
    paid_amount: paidAmount,
    pending_amount: pendingAmount,
    payment_status: paymentStatus,
    advance_code: advanceCode,
  }
}
