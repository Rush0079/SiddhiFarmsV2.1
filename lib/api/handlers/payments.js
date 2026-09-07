/**
 * ============================================================================
 * PAYMENTS DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles payment gateway integration & fallbacks:
 *                1. Direct UPI Configuration (VPA, Payee Name) & QR Code file uploads
 *                2. UPI Claim recording from guests
 *                3. Razorpay Order Creation (initial booking or balance settlement)
 *                4. Razorpay Signature Verification with HMAC SHA256 & email dispatch
 *
 * @module        lib/api/handlers/payments
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import {
  requireRole,
  getPaymentConfig,
  savePaymentConfig,
  enrichBookingWithAdvanceNotes,
  sendPaymentConfirmation,
} from '@/lib/api/guards'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendAdminConfigAlert } from '@/lib/booking-email'

/**
 * Handles GET /api/payments/config
 *
 * @param {Object} admin - Supabase admin client.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetPaymentConfig(admin) {
  console.log('[API:PAYMENTS:GET_CONFIG] Fetching UPI & payment configuration')
  return NextResponse.json(await getPaymentConfig(admin))
}

/**
 * Handles POST /api/payments/config
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - Inbound request body { upiId, upiName, qrUrl }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePostPaymentConfig(admin, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const upiId = String(body.upiId ?? '').trim().slice(0, 80)
  if (upiId && !/^[\w.-]{2,}@[\w-]{2,}$/.test(upiId))
    return NextResponse.json({ error: 'UPI ID should look like name@bank' }, { status: 400 })

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
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json(config)
}

/**
 * Handles POST /api/payments/qr (Multipart QR code file upload)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Request} req  - Inbound HTTP request with FormData.
 * @returns {Promise<NextResponse>}
 */
export async function handleUploadPaymentQr(admin, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const form = await req.formData()
  const file = form.get('file')
  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'QR image file is required' }, { status: 400 })
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimeTypes.includes(file.type?.toLowerCase()))
    return NextResponse.json({ error: 'Only JPG, PNG, WEBP, and GIF images are allowed' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })

  console.log(`[API:PAYMENTS:QR_UPLOAD] Uploading custom UPI QR image by ${guard.user.id}`)
  await admin.storage.createBucket('site-images', { public: true }).catch(() => {})
  const ext =
    (file.name?.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png'
  const objectPath = `payment-qr-${Date.now()}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('site-images')
    .upload(objectPath, bytes, { contentType: file.type, upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  const { data: pub } = admin.storage.from('site-images').getPublicUrl(objectPath)

  const config = await getPaymentConfig(admin)
  config.qrUrl = pub.publicUrl
  const { error: setErr } = await savePaymentConfig(admin, config)
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 })

  console.log(`[API:PAYMENTS:QR_SUCCESS] UPI QR updated: ${pub.publicUrl}`)
  return NextResponse.json(config)
}

/**
 * Handles POST /api/payments/upi-claim (Guest submits UPI reference)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { bookingId, reference }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleUpiClaim(admin, body, req) {
  const clientIp = getClientIp(req)
  const limit = checkRateLimit(clientIp, 'upi_claim', 10, 5 * 60 * 1000)
  if (!limit.allowed) {
    console.warn(`[API:PAYMENTS:CLAIM_RATE_LIMIT] IP ${clientIp} exceeded UPI claim limit`)
    return NextResponse.json(
      { error: `Too many claim attempts. Please try again in ${limit.resetInSeconds}s.` },
      { status: 429 }
    )
  }

  const bookingId = String(body.bookingId || '')
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const { data: booking } = await admin
    .from('bookings')
    .select('id, paid, notes')
    .eq('id', bookingId)
    .single()
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

/**
 * Handles POST /api/razorpay/order
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { bookingId, type }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleCreateRazorpayOrder(admin, body, req) {
  const clientIp = getClientIp(req)
  const limit = checkRateLimit(clientIp, 'razorpay_order', 15, 5 * 60 * 1000)
  if (!limit.allowed) {
    console.warn(`[API:RAZORPAY:ORDER_RATE_LIMIT] IP ${clientIp} exceeded order creation limit`)
    return NextResponse.json(
      { error: `Too many payment requests. Please try again in ${limit.resetInSeconds}s.` },
      { status: 429 }
    )
  }

  const { bookingId, type } = body
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const { data: rawBooking } = await admin.from('bookings').select('*').eq('id', bookingId).single()
  if (!rawBooking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  const booking = enrichBookingWithAdvanceNotes(rawBooking)

  const isBalance = type === 'balance'
  const payAmount = isBalance
    ? Number(booking.pending_amount) || Number(booking.amount)
    : Number(booking.amount)

  const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  const order = await rzp.orders.create({
    amount: Math.round(payAmount * 100), // in paise
    currency: 'INR',
    receipt: `${booking.id}${isBalance ? '-BAL' : ''}`,
    notes: {
      bookingId: booking.id,
      service: booking.service,
      guest: booking.name,
      type: isBalance ? 'balance' : 'initial',
    },
  })

  await admin.from('bookings').update({ razorpay_order_id: order.id }).eq('id', booking.id)
  console.log(`[API:RAZORPAY:ORDER_CREATED] Order ${order.id} generated for booking ${booking.id} (₹${payAmount})`)

  return NextResponse.json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    booking,
    payAmount,
  })
}

/**
 * Handles POST /api/razorpay/verify
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, type }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleVerifyRazorpayPayment(admin, body, req) {
  const clientIp = getClientIp(req)
  const limit = checkRateLimit(clientIp, 'razorpay_verify', 20, 5 * 60 * 1000)
  if (!limit.allowed) {
    console.warn(`[API:RAZORPAY:VERIFY_RATE_LIMIT] IP ${clientIp} exceeded verify limit`)
    return NextResponse.json(
      { error: `Too many verification requests. Please try again in ${limit.resetInSeconds}s.` },
      { status: 429 }
    )
  }

  const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature, type } = body
  if (!bookingId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  const expectedBuf = Buffer.from(expected, 'utf8')
  const actualBuf = Buffer.from(String(razorpay_signature || ''), 'utf8')
  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    console.error(`[API:RAZORPAY:SIGNATURE_MISMATCH] Cryptographic verification failed for booking ${bookingId}`)
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
  }

  const { data: rawExisting } = await admin.from('bookings').select('*').eq('id', bookingId).single()
  if (!rawExisting) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  // Prevent Payment Order ID Substitution / Tampering
  if (rawExisting.razorpay_order_id && rawExisting.razorpay_order_id !== razorpay_order_id) {
    console.error(
      `[API:RAZORPAY:ORDER_MISMATCH] Order ID substitution attempt for booking ${bookingId}: expected ${rawExisting.razorpay_order_id}, got ${razorpay_order_id}`
    )
    return NextResponse.json({ error: 'Payment order does not match reservation' }, { status: 400 })
  }
  const existing = enrichBookingWithAdvanceNotes(rawExisting)

  const isBalance = type === 'balance' || (existing.pending_amount > 0 && existing.paid)
  const totalAmount = Number(
    existing.total_amount || Number(existing.amount || 0) + Number(existing.pending_amount || 0)
  )

  const updateData = isBalance
    ? {
        razorpay_payment_id,
        razorpay_signature,
        paid: true,
        paid_amount: totalAmount,
        pending_amount: 0,
        payment_status: 'full',
        status: 'confirmed',
      }
    : {
        razorpay_payment_id,
        razorpay_signature,
        paid: true,
        paid_amount: existing.amount,
        pending_amount: existing.pending_amount,
        total_amount: totalAmount,
        payment_status: existing.pending_amount > 0 ? 'advance' : 'full',
        status: 'confirmed',
      }

  let { data, error } = await admin
    .from('bookings')
    .update(updateData)
    .eq('id', bookingId)
    .select()
    .single()

  if (error) {
    const fallbackUpdate = {
      razorpay_payment_id,
      razorpay_signature,
      paid: true,
      status: 'confirmed',
    }
    if (isBalance) {
      const updatedNotes = (existing.notes || '').replace(
        /Pending Balance:\s*₹\d+/i,
        'Pending Balance: ₹0 (Cleared)'
      )
      fallbackUpdate.notes = updatedNotes
    }
    const fallbackRes = await admin
      .from('bookings')
      .update(fallbackUpdate)
      .eq('id', bookingId)
      .select()
      .single()
    if (fallbackRes.error)
      return NextResponse.json({ error: fallbackRes.error.message }, { status: 500 })
    data = fallbackRes.data
  }

  // Atomically commit coupon usage
  if (existing.applied_coupon && !isBalance) {
    const { data: cp } = await admin
      .from('coupons')
      .select('id, used')
      .eq('code', existing.applied_coupon)
      .single()
    if (cp) {
      await admin.from('coupons').update({ used: (cp.used || 0) + 1 }).eq('id', cp.id)
    }
  }

  const enriched = enrichBookingWithAdvanceNotes(data)
  console.log(`[API:RAZORPAY:VERIFY_SUCCESS] Payment confirmed for ${bookingId} (${razorpay_payment_id})`)
  const email = await sendPaymentConfirmation(
    admin,
    enriched,
    isBalance ? 'Razorpay (Balance settlement)' : 'Razorpay'
  )
  return NextResponse.json({ ok: true, booking: enriched, email })
}
