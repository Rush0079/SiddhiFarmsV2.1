/**
 * ============================================================================
 * SIDDHI FARM RESORT - CENTRALIZED API ROUTE DISPATCHER
 * ============================================================================
 *
 * ARCHITECTURE & DESIGN PATTERNS:
 * 1. Front Controller / API Gateway Pattern:
 *    Acts as a unified entrance (`/api/[[...path]]`) routing REST operations to domain
 *    handlers, eliminating monolithic bloat and decoupling domain concerns.
 *
 * 2. Interceptor Pipeline:
 *    Delegates security validation, RBAC, reCAPTCHA v3 bot protection, and DDoS
 *    rate-limiting to domain handler pipelines.
 *
 * 3. Strategy / Adapter Pattern:
 *    Routes to specialized domain processors:
 *    - Bookings & Reservations: `lib/api/handlers/bookings.js`
 *    - Dynamic Rates: `lib/api/handlers/pricing.js`
 *    - Coupons & Advance Codes: `lib/api/handlers/coupons.js`
 *    - Payment Gateway & UPI: `lib/api/handlers/payments.js`
 *    - Visual Assets CMS: `lib/api/handlers/images.js`
 *    - Terms & Policies: `lib/api/handlers/terms.js`
 *    - Promotional Flash Sale: `lib/api/handlers/flash-sale.js`
 *    - Administrative Provisioning & 2FA: `lib/api/handlers/admin-users.js`
 *
 * LOGGING CONVENTION:
 * [API:<MODULE>:<ACTION>] <DETAILS> [STATUS]
 *
 * @module        app/api/[[...path]]/route
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// Domain API Handlers
import {
  handleGetPricing,
  handlePostPricing,
} from '@/lib/api/handlers/pricing'
import {
  handleGetBookings,
  handleGetPublicBooking,
  handleGetSummary,
  handleCreateBooking,
  handlePatchBooking,
  handleDeleteBooking,
} from '@/lib/api/handlers/bookings'
import {
  handleGetCoupons,
  handlePostCoupon,
  handlePatchCoupon,
  handleDeleteCoupon,
  handleGetAdvanceCodes,
  handlePostAdvanceCode,
  handleDeleteAdvanceCode,
} from '@/lib/api/handlers/coupons'
import {
  handleGetImages,
  handlePostImages,
  handleUploadImage,
} from '@/lib/api/handlers/images'
import {
  handleGetPaymentConfig,
  handlePostPaymentConfig,
  handleUploadPaymentQr,
  handleUpiClaim,
  handleCreateRazorpayOrder,
  handleVerifyRazorpayPayment,
} from '@/lib/api/handlers/payments'
import {
  handleGetTerms,
  handlePostTerms,
} from '@/lib/api/handlers/terms'
import {
  handleGetFlashSale,
  handlePostFlashSale,
  handleUploadFlashSaleBanner,
} from '@/lib/api/handlers/flash-sale'
import {
  handleGetCustomers,
  handlePatchCustomerRole,
  handleDeleteCustomer,
  handleRequestAuthOtp,
  handleCreateUser,
  handleAuthMe,
  handleAuth2FaSend,
  handleAuth2FaVerify,
  handleGetMe,
} from '@/lib/api/handlers/admin-users'

/**
 * GET Dispatcher - Centralized Read Operations
 *
 * @param {Request} request - Incoming HTTP request.
 * @param {{ params: Promise<{ path?: string[] }> }} context - Dynamic route parameters.
 * @returns {Promise<NextResponse>}
 */
export async function GET(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // 1. GET /api/pricing
    if (path[0] === 'pricing') {
      return handleGetPricing(admin)
    }

    // 2. GET /api/bookings (Admin list)
    if (path[0] === 'bookings' && path.length === 1) {
      return handleGetBookings(admin, request)
    }

    // 3. GET /api/bookings/public/:id
    if (path[0] === 'bookings' && path[1] === 'public' && path[2]) {
      return handleGetPublicBooking(admin, path[2])
    }

    // 4. GET /api/coupons & /api/coupons/validate
    if (path[0] === 'coupons') {
      return handleGetCoupons(admin, path, request)
    }

    // 5. GET /api/advance-codes & /api/advance-codes/validate
    if (path[0] === 'advance-codes') {
      return handleGetAdvanceCodes(admin, path, request)
    }

    // 6. GET /api/auth/me
    if (path[0] === 'auth' && path[1] === 'me') {
      return handleAuthMe(admin, request)
    }

    // 7. GET /api/images
    if (path[0] === 'images') {
      return handleGetImages(admin)
    }

    // 8. GET /api/payments/config
    if (path[0] === 'payments' && path[1] === 'config') {
      return handleGetPaymentConfig(admin)
    }

    // 9. GET /api/booking-terms
    if (path[0] === 'booking-terms') {
      return handleGetTerms(admin)
    }

    // 10. GET /api/admin/summary
    if (path[0] === 'admin' && path[1] === 'summary') {
      return handleGetSummary(admin, request)
    }

    // 11. GET /api/admin/customers
    if (path[0] === 'admin' && path[1] === 'customers') {
      return handleGetCustomers(admin, request)
    }

    // 12. GET /api/me (SSR session verification)
    if (path[0] === 'me') {
      return handleGetMe(admin)
    }

    // 13. GET /api/flash-sale
    if (path[0] === 'flash-sale') {
      return handleGetFlashSale(admin)
    }

    console.warn(`[API:ROUTER:NOT_FOUND] Unrecognized GET path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:GET:FATAL_ERROR]', e?.message || e)
    return NextResponse.json(
      { error: 'Unable to load resort data', details: e.message },
      { status: 500 }
    )
  }
}

/**
 * POST Dispatcher - Centralized Mutation & Execution Operations
 *
 * @param {Request} request - Incoming HTTP request.
 * @param {{ params: Promise<{ path?: string[] }> }} context - Dynamic route parameters.
 * @returns {Promise<NextResponse>}
 */
export async function POST(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // ─── Multipart Form-Data Routes ─────────────────────────────────────────
    // 1. POST /api/images/upload
    if (path[0] === 'images' && path[1] === 'upload') {
      return handleUploadImage(admin, request)
    }

    // 2. POST /api/payments/qr
    if (path[0] === 'payments' && path[1] === 'qr') {
      return handleUploadPaymentQr(admin, request)
    }

    // 3. POST /api/flash-sale/upload
    if (path[0] === 'flash-sale' && path[1] === 'upload') {
      return handleUploadFlashSaleBanner(admin, request)
    }

    // ─── JSON Body Routes ───────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}))

    // 4. POST /api/advance-codes
    if (path[0] === 'advance-codes') {
      return handlePostAdvanceCode(admin, body, request)
    }

    // 5. POST /api/bookings
    if (path[0] === 'bookings') {
      return handleCreateBooking(admin, body, request)
    }

    // 6. POST /api/pricing
    if (path[0] === 'pricing') {
      return handlePostPricing(admin, body, request)
    }

    // 7. POST /api/booking-terms
    if (path[0] === 'booking-terms') {
      return handlePostTerms(admin, body, request)
    }

    // 8. POST /api/coupons
    if (path[0] === 'coupons') {
      return handlePostCoupon(admin, body, request)
    }

    // 9. POST /api/images
    if (path[0] === 'images') {
      return handlePostImages(admin, body, request)
    }

    // 10. POST /api/payments/config
    if (path[0] === 'payments' && path[1] === 'config') {
      return handlePostPaymentConfig(admin, body, request)
    }

    // 11. POST /api/payments/upi-claim
    if (path[0] === 'payments' && path[1] === 'upi-claim') {
      return handleUpiClaim(admin, body, request)
    }

    // 12. POST /api/razorpay/order
    if (path[0] === 'razorpay' && path[1] === 'order') {
      return handleCreateRazorpayOrder(admin, body, request)
    }

    // 13. POST /api/razorpay/verify
    if (path[0] === 'razorpay' && path[1] === 'verify') {
      return handleVerifyRazorpayPayment(admin, body, request)
    }

    // 14. POST /api/admin/auth-otp/request
    if (path[0] === 'admin' && path[1] === 'auth-otp' && path[2] === 'request') {
      return handleRequestAuthOtp(admin, body, request)
    }

    // 15. POST /api/admin/create-user
    if (path[0] === 'admin' && path[1] === 'create-user') {
      return handleCreateUser(admin, body, request)
    }

    // 16. POST /api/flash-sale
    if (path[0] === 'flash-sale') {
      return handlePostFlashSale(admin, body, request)
    }

    // 17. POST /api/auth/2fa/send
    if (path[0] === 'auth' && path[1] === '2fa' && path[2] === 'send') {
      return handleAuth2FaSend(admin, body, request)
    }

    // 18. POST /api/auth/2fa/verify
    if (path[0] === 'auth' && path[1] === '2fa' && path[2] === 'verify') {
      return handleAuth2FaVerify(admin, body, request)
    }

    console.warn(`[API:ROUTER:NOT_FOUND] Unrecognized POST path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:POST:FATAL_ERROR]', e?.message || e)
    return NextResponse.json(
      { error: 'Unable to save resort data', details: e.message },
      { status: 500 }
    )
  }
}

/**
 * PATCH Dispatcher - State Modification & Settlement Operations
 *
 * @param {Request} request - Incoming HTTP request.
 * @param {{ params: Promise<{ path?: string[] }> }} context - Dynamic route parameters.
 * @returns {Promise<NextResponse>}
 */
export async function PATCH(request, { params }) {
  try {
    const path = (await params)?.path || []
    const body = await request.json().catch(() => ({}))
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // 1. PATCH /api/bookings/:id
    if (path[0] === 'bookings' && path[1]) {
      return handlePatchBooking(admin, path[1], body, request)
    }

    // 2. PATCH /api/coupons/:id
    if (path[0] === 'coupons' && path[1]) {
      return handlePatchCoupon(admin, path[1], body, request)
    }

    // 3. PATCH /api/admin/customers
    if (path[0] === 'admin' && path[1] === 'customers') {
      return handlePatchCustomerRole(admin, body, request)
    }

    console.warn(`[API:ROUTER:NOT_FOUND] Unrecognized PATCH path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:PATCH:FATAL_ERROR]', e?.message || e)
    return NextResponse.json(
      { error: 'Unable to update resort data', details: e.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE Dispatcher - Resource Deletion Operations
 *
 * @param {Request} request - Incoming HTTP request.
 * @param {{ params: Promise<{ path?: string[] }> }} context - Dynamic route parameters.
 * @returns {Promise<NextResponse>}
 */
export async function DELETE(request, { params }) {
  try {
    const path = (await params)?.path || []
    const admin = supabaseAdmin()
    const routeKey = path.join('/')

    // 1. DELETE /api/advance-codes/:id
    if (path[0] === 'advance-codes' && path[1]) {
      return handleDeleteAdvanceCode(admin, path[1], request)
    }

    // 2. DELETE /api/coupons/:id
    if (path[0] === 'coupons' && path[1]) {
      return handleDeleteCoupon(admin, path[1], request)
    }

    // 3. DELETE /api/bookings/:id
    if (path[0] === 'bookings' && path[1]) {
      return handleDeleteBooking(admin, path[1], request)
    }

    // 4. DELETE /api/admin/customers/:id
    if (path[0] === 'admin' && path[1] === 'customers' && path[2]) {
      return handleDeleteCustomer(admin, path[2], request)
    }

    console.warn(`[API:ROUTER:NOT_FOUND] Unrecognized DELETE path: /api/${routeKey}`)
    return NextResponse.json({ error: 'Route not found' }, { status: 404 })
  } catch (e) {
    console.error('[API:DELETE:FATAL_ERROR]', e?.message || e)
    return NextResponse.json(
      { error: 'Unable to delete resort data', details: e.message },
      { status: 500 }
    )
  }
}
