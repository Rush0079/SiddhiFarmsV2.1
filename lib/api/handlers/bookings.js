/**
 * ============================================================================
 * BOOKINGS DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles guest reservation lifecycle management:
 *                1. Booking creation with rate-limiting, reCAPTCHA v3 & date overlap checks
 *                2. Strict server-side rate calculation with coupon & advance code redemption
 *                3. Administrative listing & operational summary calculation
 *                4. Public masked booking retrieval for guest invoices/receipts
 *                5. Status patching (check-in/out times, confirmations, cancellations, balance clearance)
 *                6. Reservation record deletion with RBAC enforcement
 *
 * DESIGN PATTERNS:
 * - Chain of Responsibility: Rate Limit -> reCAPTCHA -> Payload Guard -> Overlap Check -> DB Insert
 * - Unit of Work / Fallback: Schema migration resilience for advance payment columns
 * - Strategy: Multi-channel confirmation on state transition (WhatsApp, Email, Alert)
 *
 * @module        lib/api/handlers/bookings
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  requireRole,
  cleanPricing,
  overlaps,
  SERVICE_RATE_KEYS,
  SERVICE_SHORT_STAY_RATE_KEYS,
  getBookingTerms,
  getAdvanceCodes,
  saveAdvanceCodes,
  enrichBookingWithAdvanceNotes,
  sendPaymentConfirmation,
} from '@/lib/api/guards'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyRecaptcha } from '@/lib/recaptcha'
import { sendBookingCancellationEmail } from '@/lib/booking-email'

/**
 * Handles GET /api/bookings (Admin list of recent bookings)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetBookings(admin, req) {
  const guard = await requireRole(['staff', 'manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  console.log(
    `[API:BOOKINGS:LIST] Admin ${guard.user.id} (${guard.profile.role}) fetching recent bookings`
  )
  const { data, error } = await admin
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) {
    console.error('[API:BOOKINGS:LIST_ERROR]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json((data || []).map(enrichBookingWithAdvanceNotes))
}

/**
 * Handles GET /api/bookings/public/:id
 * Provides sanitized, masked booking data for guest self-service receipts & invoice views.
 *
 * @param {Object} admin     - Supabase admin client.
 * @param {string} bookingId - Unique reservation ID (e.g. SFR-1234ABCD).
 * @returns {Promise<NextResponse>}
 */
export async function handleGetPublicBooking(admin, bookingId) {
  console.log(`[API:BOOKINGS:GET_PUBLIC] Fetching public summary for booking ${bookingId}`)
  const { data: rawBooking, error } = await admin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (error || !rawBooking) {
    console.warn(`[API:BOOKINGS:NOT_FOUND] Booking ${bookingId} not found`)
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const booking = enrichBookingWithAdvanceNotes(rawBooking)
  const rawPhone = String(booking.phone || '')
  const maskedPhone =
    rawPhone.length > 5 ? `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}` : rawPhone

  return NextResponse.json({
    id: booking.id,
    name: booking.name,
    email: booking.email,
    phone: maskedPhone,
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

/**
 * Handles GET /api/admin/summary
 * Computes high-level operational statistics for the admin dashboard.
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetSummary(admin, req) {
  const guard = await requireRole(['staff', 'manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  console.log(`[API:ADMIN:SUMMARY] Admin ${guard.user.id} generating operational dashboard metrics`)
  const { data: bookings } = await admin.from('bookings').select('status,amount')
  const { count: activeCoupons } = await admin
    .from('coupons')
    .select('*', { count: 'exact', head: true })
    .eq('active', true)

  const list = bookings || []
  return NextResponse.json({
    bookings: list.length,
    pending: list.filter((i) => i.status === 'pending').length,
    confirmed: list.filter((i) => i.status === 'confirmed').length,
    revenue: list.reduce((s, i) => s + (Number(i.amount) || 0), 0),
    activeCoupons: activeCoupons || 0,
  })
}

/**
 * Handles POST /api/bookings (Create a new reservation)
 * Performs rate limiting, reCAPTCHA v3 bot verification, payload validation,
 * date overlap checking, dynamic pricing calculation, coupon/advance code redemption,
 * and database insertion.
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - Booking creation payload.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleCreateBooking(admin, body, req) {
  const clientIp = getClientIp(req)
  const limit = checkRateLimit(clientIp, 'create_booking', 10, 5 * 60 * 1000)
  if (!limit.allowed) {
    console.warn(`[API:BOOKINGS:RATE_LIMIT] IP ${clientIp} exceeded booking creation limit`)
    return NextResponse.json(
      { error: `Too many booking requests. Please try again in ${limit.resetInSeconds}s.` },
      { status: 429 }
    )
  }

  // 1. Google reCAPTCHA v3 verification
  const recaptchaToken = body.recaptchaToken || body.recaptcha_token
  const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'booking_submit')
  if (!recaptchaResult.success) {
    console.warn(`[API:BOOKINGS:RECAPTCHA_FAILED] IP ${clientIp} failed bot score verification`)
    return NextResponse.json(
      { error: recaptchaResult.error || 'Security verification failed. Please try again.' },
      { status: 403 }
    )
  }

  // 2. Input validation
  if (!body.name || !body.email || !body.phone || !body.checkIn || !body.checkOut || !body.service) {
    return NextResponse.json(
      { error: 'Please complete all required booking details' },
      { status: 400 }
    )
  }

  // Validate service against registered rate card keys
  if (!SERVICE_RATE_KEYS[body.service]) {
    return NextResponse.json(
      { error: 'Invalid accommodation or event service selected' },
      { status: 400 }
    )
  }

  // Validate contact info format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(String(body.email || '').trim())) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
  }
  const cleanDigitsPhone = String(body.phone || '').replace(/\D/g, '')
  if (cleanDigitsPhone.length < 10 || cleanDigitsPhone.length > 15) {
    return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 })
  }

  if (body.termsAccepted !== true) {
    return NextResponse.json(
      { error: 'You must accept the booking terms and conditions before continuing' },
      { status: 400 }
    )
  }

  const rawAadhaar = String(
    body.aadhaarNumber || body.aadhaar_number || body.aadhaar || ''
  ).replace(/\D/g, '')
  if (rawAadhaar && rawAadhaar.length !== 12) {
    return NextResponse.json({ error: 'Aadhaar number must be 12 digits' }, { status: 400 })
  }
  const formattedAadhaar = rawAadhaar ? rawAadhaar.replace(/(\d{4})(?=\d)/g, '$1 ') : null

  const checkIn = new Date(body.checkIn)
  const checkOut = new Date(body.checkOut)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
    return NextResponse.json(
      { error: 'Please provide valid check-in and check-out dates' },
      { status: 400 }
    )
  }
  if (checkIn < today || checkOut < today) {
    return NextResponse.json(
      { error: 'Past dates are not allowed. Please select today or a future date.' },
      { status: 400 }
    )
  }

  // 3. Determine booking classification
  const eventServices = [
    'Engagement Ceremony',
    'Birthday Party',
    'Get Together',
    'Wedding Ceremony',
  ]
  const dayTourServices = [
    'One Day Tour',
    'Mini Water Park',
    'One Day Tour + Mini Water Park',
    'One Day Tour + Mini Adventure Park',
  ]
  const isEventService = eventServices.includes(body.service)
  const isDayTourService = dayTourServices.includes(body.service)
  const isShortStay = Boolean(body.isShortStay || body.stayType === 'short_stay')
  const isSingleDayBooking = isEventService || isDayTourService || isShortStay

  if (isSingleDayBooking) {
    if (checkOut < checkIn) {
      return NextResponse.json(
        { error: 'Check-out date must be on or after check-in date' },
        { status: 400 }
      )
    }
  } else {
    if (checkOut <= checkIn) {
      return NextResponse.json(
        { error: 'Check-out must be after check-in date' },
        { status: 400 }
      )
    }
  }

  // 4. Overlap check against pending and confirmed reservations
  const { data: existing } = await admin
    .from('bookings')
    .select('check_in, check_out')
    .eq('service', body.service)
    .in('status', ['pending', 'confirmed'])

  if (
    (existing || []).some((row) =>
      overlaps(body.checkIn, body.checkOut, row.check_in, row.check_out)
    )
  ) {
    console.warn(
      `[API:BOOKINGS:OVERLAP_CONFLICT] Overlap detected for ${body.service} (${body.checkIn} to ${body.checkOut})`
    )
    return NextResponse.json(
      { error: 'Those dates are no longer available for this accommodation/event' },
      { status: 409 }
    )
  }

  // 5. Pricing - Strict server-side rate calculation
  const { data: pricingRow } = await admin
    .from('pricing')
    .select('values')
    .eq('id', 'current')
    .single()
  const rates = cleanPricing(pricingRow?.values)
  const rateKey = SERVICE_RATE_KEYS[body.service]
  const guests = Math.max(1, Math.min(200, Number(body.guests) || 1))
  const rawNights = Math.ceil((checkOut - checkIn) / 86400000)
  const nights = isSingleDayBooking ? 1 : Math.max(1, rawNights)

  let subtotal = 0
  if (isShortStay) {
    const shortKey = SERVICE_SHORT_STAY_RATE_KEYS[body.service]
    subtotal =
      shortKey && rates[shortKey]
        ? Number(rates[shortKey])
        : Math.round((rates[rateKey] || 0) * 0.5)
  } else if (isEventService) {
    subtotal = rates[rateKey] || 0
  } else if (isDayTourService) {
    subtotal = (rates[rateKey] || 0) * guests
  } else {
    subtotal = (rates[rateKey] || 0) * nights
  }

  if (subtotal <= 0) {
    return NextResponse.json(
      { error: 'Unable to calculate reservation rate. Please contact resort management.' },
      { status: 400 }
    )
  }

  // 6. Default slot timings
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

  // 7. Coupon application
  let discount = 0
  let appliedCoupon = null
  if (body.couponCode) {
    const code = body.couponCode.trim().toUpperCase()
    const { data: coupon } = await admin
      .from('coupons')
      .select('*')
      .eq('code', code)
      .eq('active', true)
      .single()
    if (
      coupon &&
      (!coupon.usage_limit || coupon.used < coupon.usage_limit) &&
      (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
      subtotal >= (coupon.min_amount || 0)
    ) {
      discount =
        coupon.type === 'fixed'
          ? Math.min(subtotal, Number(coupon.value))
          : Math.round((subtotal * Math.min(100, Number(coupon.value))) / 100)
      if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount)
      appliedCoupon = coupon.code
    }
  }

  // 8. Check for Advance Code (single-use auto-delete)
  let isAdvanceBooking = false
  let appliedAdvanceCode = null
  let depositAmount = 0
  let pendingBalance = 0
  const passedAdvCode = String(body.advanceCode || body.couponCode || '')
    .trim()
    .toUpperCase()

  if (passedAdvCode) {
    const allAdvCodes = await getAdvanceCodes(admin)
    const advIdx = allAdvCodes.findIndex(
      (c) => c.code.toUpperCase() === passedAdvCode && c.active
    )
    if (advIdx !== -1) {
      const adv = allAdvCodes[advIdx]
      const netTotal = Math.max(0, subtotal - discount)
      depositAmount =
        adv.percentage !== null && adv.percentage !== undefined
          ? Math.round((netTotal * Math.min(100, Number(adv.percentage))) / 100)
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

  // 9. Attach authenticated user session if present
  let userId = null
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) userId = user.id
  } catch {}

  const bookingId = `SFR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  const totalBill = Math.max(0, subtotal - discount)
  const chargeAmount = isAdvanceBooking ? depositAmount : totalBill
  const bookingTerms = await getBookingTerms(admin)
  const sanitizedName = String(body.name || '')
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 80)
  const sanitizedEmail = String(body.email || '')
    .trim()
    .toLowerCase()
    .slice(0, 100)
  const sanitizedPhone = String(body.phone || '')
    .trim()
    .replace(/[^\d+ -]/g, '')
    .slice(0, 20)

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
    guests,
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
    notes: isShortStay
      ? `Short Stay (${checkInTime} to ${checkOutTime})`
      : isEventService
      ? `Event: ${body.service} (${checkInTime} to ${checkOutTime})`
      : null,
    terms_accepted_at: new Date().toISOString(),
    terms_version: bookingTerms.version,
    terms_content: bookingTerms.terms,
    status: 'pending',
  }

  // 10. Database insertion with graceful column fallback
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
    if (isAdvanceBooking) {
      noteParts.push(
        `Advance Deposit: ₹${depositAmount} | Pending Balance: ₹${pendingBalance} (Code: ${appliedAdvanceCode})`
      )
    }
    if (noteParts.length) {
      fallbackRecord.notes = fallbackRecord.notes
        ? `${fallbackRecord.notes}\n${noteParts.join('\n')}`
        : noteParts.join('\n')
    }
    const fallbackRes = await admin.from('bookings').insert(fallbackRecord)
    insErr = fallbackRes.error
  }

  if (insErr) {
    console.error(`[API:BOOKINGS:INSERT_ERROR] Failed saving ${bookingId}:`, insErr.message)
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  console.log(
    `[API:BOOKINGS:CREATED] Booking ${bookingId} initialized for ${sanitizedName} (Amount: ₹${chargeAmount})`
  )
  return NextResponse.json(record, { status: 201 })
}

/**
 * Handles PATCH /api/bookings/:id
 * Modifies reservation attributes:
 * - Status transition (pending, confirmed, cancelled, completed)
 * - Check-in and check-out arrival/departure timings
 * - Manual balance clearance (zeroing out pending balance, issuing receipt)
 * - Idempotent manual payment verification
 * - Automated cancellation email with refund disclaimer
 *
 * @param {Object} admin     - Supabase admin client.
 * @param {string} bookingId - Unique reservation ID.
 * @param {Object} body      - Modification payload.
 * @param {Request} req      - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePatchBooking(admin, bookingId, body, req) {
  const guard = await requireRole(['staff', 'manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const patch = {}
  if (['pending', 'confirmed', 'cancelled', 'completed'].includes(body.status)) {
    patch.status = body.status
  }
  if (typeof body.paid === 'boolean') patch.paid = body.paid

  if ('checkInTime' in body) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.checkInTime))) {
      return NextResponse.json(
        { error: 'Check-in time must use HH:MM format' },
        { status: 400 }
      )
    }
    patch.check_in_time = body.checkInTime
  }

  if ('checkOutTime' in body) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.checkOutTime))) {
      return NextResponse.json(
        { error: 'Check-out time must use HH:MM format' },
        { status: 400 }
      )
    }
    patch.check_out_time = body.checkOutTime
  }

  if (!Object.keys(patch).length && !body.markBalance) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }
  if (body.paid === true && !patch.status) patch.status = 'confirmed'

  console.log(
    `[API:BOOKINGS:PATCH] Updating booking ${bookingId} by ${guard.user.id} (${guard.profile.role})`,
    patch
  )

  // 1. Manual clearance of remaining balance
  if (body.markBalance === true) {
    const { data: rawExisting } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()
    if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const existing = enrichBookingWithAdvanceNotes(rawExisting)
    const total = Number(
      existing.total_amount ||
        Number(existing.amount || 0) + Number(existing.pending_amount || 0)
    )

    let { data, error } = await admin
      .from('bookings')
      .update({
        paid: true,
        paid_amount: total,
        pending_amount: 0,
        payment_status: 'full',
        status: 'confirmed',
      })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      const updatedNotes = (existing.notes || '').replace(
        /Pending Balance:\s*₹\d+/i,
        'Pending Balance: ₹0 (Cleared)'
      )
      const fallbackRes = await admin
        .from('bookings')
        .update({ paid: true, status: 'confirmed', notes: updatedNotes })
        .eq('id', bookingId)
        .select()
        .single()
      if (fallbackRes.error) {
        return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
      }
      data = fallbackRes.data
    }

    const enriched = enrichBookingWithAdvanceNotes(data)
    console.log(`[API:BOOKINGS:BALANCE_CLEARED] Booking ${bookingId} balance cleared manually`)
    const email = await sendPaymentConfirmation(admin, enriched, 'Manual balance clearance')
    return NextResponse.json({ ...enriched, email })
  }

  // 2. Idempotent unpaid -> paid transition
  if (body.paid === true) {
    const { data: rawExisting } = await admin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()
    if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const existing = enrichBookingWithAdvanceNotes(rawExisting)
    const updatePayload = {
      ...patch,
      paid_amount: existing.amount,
      pending_amount: existing.pending_amount,
      total_amount: existing.total_amount,
      payment_status: existing.pending_amount > 0 ? 'advance' : 'full',
    }

    let { data, error } = await admin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .eq('paid', false)
      .select()
      .maybeSingle()

    if (error) {
      const fallbackRes = await admin
        .from('bookings')
        .update(patch)
        .eq('id', bookingId)
        .eq('paid', false)
        .select()
        .maybeSingle()
      if (fallbackRes.error) {
        return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
      }
      data = fallbackRes.data
    }

    if (!data) {
      const { data: current, error: currentError } = await admin
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()
      if (currentError || !current) {
        return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
      }
      return NextResponse.json({
        id: bookingId,
        paid: current.paid,
        status: current.status,
        email: { sent: false, reason: 'already-paid' },
      })
    }

    if (existing.applied_coupon) {
      const { data: cp } = await admin
        .from('coupons')
        .select('id, used')
        .eq('code', existing.applied_coupon)
        .single()
      if (cp) {
        await admin
          .from('coupons')
          .update({ used: (cp.used || 0) + 1 })
          .eq('id', cp.id)
      }
    }

    const enriched = enrichBookingWithAdvanceNotes(data)
    console.log(
      `[API:BOOKINGS:MANUAL_PAID_CONFIRMED] Booking ${bookingId} verified as paid by admin`
    )
    const email = await sendPaymentConfirmation(admin, enriched, 'manual admin verification')
    return NextResponse.json({ ...enriched, email })
  }

  // 3. Standard attribute update
  const { data: rawExisting, error: existingError } = await admin
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()
  if (existingError || !rawExisting) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  const existing = enrichBookingWithAdvanceNotes(rawExisting)
  const { data, error } = await admin
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const enriched = enrichBookingWithAdvanceNotes(data)
  let email = null

  if (patch.status === 'confirmed' && existing.status !== 'confirmed') {
    email = await sendPaymentConfirmation(admin, enriched, 'admin booking confirmation', {
      sendCustomer: false,
      sendOwners: true,
    })
  } else if (patch.status === 'cancelled' && existing.status !== 'cancelled') {
    console.log(
      `[API:BOOKINGS:CANCELLED] Booking ${bookingId} cancelled by ${guard.user.email}. Dispatching refund notification email...`
    )
    email = await sendBookingCancellationEmail({
      booking: enriched,
      cancelledBy: guard.user.email,
      reason: body.reason || 'Cancelled by resort administration',
    })
  }

  return NextResponse.json({ ...enriched, email })
}

/**
 * Handles DELETE /api/bookings/:id
 * Permanently removes a booking from the database (manager or super_admin required).
 *
 * @param {Object} admin     - Supabase admin client.
 * @param {string} bookingId - Unique reservation ID to remove.
 * @param {Request} req      - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleDeleteBooking(admin, bookingId, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { error } = await admin.from('bookings').delete().eq('id', bookingId)
  if (error) {
    console.error(`[API:BOOKINGS:DELETE_ERROR] Failed to delete booking ${bookingId}:`, error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[API:BOOKINGS:DELETED] Booking ${bookingId} deleted by ${guard.user.id}`)
  return NextResponse.json({ ok: true, id: bookingId })
}
