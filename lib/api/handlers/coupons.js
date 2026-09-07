/**
 * ============================================================================
 * COUPONS & ADVANCE CODES DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles coupon discount validation, coupon provisioning & deletion,
 *                and single-use advance deposit token lifecycle.
 *
 * @module        lib/api/handlers/coupons
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireRole, getAdvanceCodes, saveAdvanceCodes } from '@/lib/api/guards'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { sendAdminConfigAlert } from '@/lib/booking-email'

/**
 * Handles GET /api/coupons and /api/coupons/validate
 *
 * @param {Object} admin  - Supabase admin client.
 * @param {Array} path    - URL path segments.
 * @param {Request} req   - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetCoupons(admin, path, req) {
  if (path[1] === 'validate') {
    const clientIp = getClientIp(req)
    const limit = checkRateLimit(clientIp, 'coupon_validate', 30, 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Too many validation attempts. Please wait ${limit.resetInSeconds}s.` },
        { status: 429 }
      )
    }
    const url = new URL(req.url)
    const code = (url.searchParams.get('code') || '').trim().toUpperCase()
    if (!code) return NextResponse.json({ valid: false })

    const { data: coupon } = await admin
      .from('coupons')
      .select('code, value, type, active, usage_limit, used, expires_at, min_amount, max_discount')
      .eq('code', code)
      .maybeSingle()

    if (!coupon || !coupon.active) return NextResponse.json({ valid: false })
    if (coupon.usage_limit && coupon.used >= coupon.usage_limit)
      return NextResponse.json({ valid: false, error: 'Coupon usage limit reached' })
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return NextResponse.json({ valid: false, error: 'Coupon expired' })

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        value: coupon.value,
        type: coupon.type,
        min_amount: coupon.min_amount,
        max_discount: coupon.max_discount,
      },
    })
  }

  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  console.log(`[API:COUPONS:GET] Admin ${guard.user.id} fetching all coupons`)
  const { data } = await admin
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json(data || [])
}

/**
 * Handles POST /api/coupons
 *
 * @param {Object} admin  - Supabase admin client.
 * @param {Object} body   - Inbound request body.
 * @param {Request} req   - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePostCoupon(admin, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const code = String(body.code || '').trim().toUpperCase()
  const value = Number(body.value)
  const type = body.type === 'fixed' ? 'fixed' : 'percentage'
  if (!code || !(value > 0)) {
    return NextResponse.json({ error: 'Code and positive discount value are required' }, { status: 400 })
  }
  if (type === 'percentage' && value > 100) {
    return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('coupons')
    .insert({
      code,
      value,
      type,
      active: true,
      created_by: guard.user.id,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  console.log(`[API:COUPONS:CREATED] Coupon ${code} (${value}${type === 'fixed' ? '₹' : '%'}) created by ${guard.user.id}`)

  sendAdminConfigAlert({
    category: 'Coupons & Promotions',
    action: `New Coupon Created: "${code}"`,
    changedBy: guard.user.email,
    role: guard.user.role || 'manager',
    details: {
      'Coupon Code': code,
      'Discount Offer': type === 'percentage' ? `${value}% OFF` : `₹${value} Flat OFF`,
      'Status': 'Active & redeemable on checkout',
    },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json(data, { status: 201 })
}

/**
 * Handles PATCH /api/coupons/:id (Toggle active status)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {string} id    - Coupon UUID.
 * @param {Object} body  - { active: boolean }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePatchCoupon(admin, id, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const active = Boolean(body.active)
  const { data: cpBefore } = await admin.from('coupons').select('*').eq('id', id).single()
  const { error } = await admin.from('coupons').update({ active }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[API:COUPONS:TOGGLE] Coupon ${cpBefore?.code || id} active state set to ${active}`)

  sendAdminConfigAlert({
    category: 'Coupons & Promotions',
    action: `Coupon Status: "${cpBefore?.code || id}" ${active ? 'Activated 🟢' : 'Deactivated 🔴'}`,
    changedBy: guard.user.email,
    role: guard.user.role || 'manager',
    details: {
      'Coupon Code': cpBefore?.code || id,
      'Status Change': `${cpBefore?.active ? '🟢 Active' : '🔴 Inactive'} ➔ ${active ? '🟢 Active' : '🔴 Inactive'}`,
      'Discount Offer': cpBefore
        ? cpBefore.type === 'percentage'
          ? `${cpBefore.value}% OFF`
          : `₹${cpBefore.value} Flat OFF`
        : '—',
      'Usage Count': `${cpBefore?.used || 0} times used`,
    },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json({ id, active })
}

/**
 * Handles DELETE /api/coupons/:id
 *
 * @param {Object} admin - Supabase admin client.
 * @param {string} id    - Coupon UUID.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleDeleteCoupon(admin, id, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { data: cp } = await admin.from('coupons').select('*').eq('id', id).single()
  const { error } = await admin.from('coupons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[API:COUPONS:DELETED] Coupon ${cp?.code || id} deleted by ${guard.user.id}`)
  sendAdminConfigAlert({
    category: 'Coupons & Promotions',
    action: `Coupon Deleted: "${cp?.code || id}"`,
    changedBy: guard.user.email,
    role: guard.user.role || 'manager',
    details: {
      'Deleted Coupon Code': cp?.code || id,
      'Discount Offer': cp
        ? cp.type === 'percentage'
          ? `${cp.value}% OFF`
          : `₹${cp.value} Flat OFF`
        : '—',
      'Times Used': cp?.used || 0,
      'Action': 'Permanently removed from active coupons',
    },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json({ ok: true, id })
}

/**
 * Handles GET /api/advance-codes and /api/advance-codes/validate
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Array} path   - URL path segments.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetAdvanceCodes(admin, path, req) {
  if (path[1] === 'validate') {
    const clientIp = getClientIp(req)
    const limit = checkRateLimit(clientIp, 'advance_validate', 30, 60 * 1000)
    if (!limit.allowed) {
      console.warn(`[API:ADVANCE_CODES:RATE_LIMIT] IP ${clientIp} exceeded validate limit`)
      return NextResponse.json(
        { error: `Too many validation attempts. Please try again in ${limit.resetInSeconds}s.` },
        { status: 429 }
      )
    }
    const url = new URL(req.url)
    const code = (url.searchParams.get('code') || '').trim().toUpperCase()
    if (!code) return NextResponse.json({ valid: false })

    const codes = await getAdvanceCodes(admin)
    const found = codes.find((c) => c.code.toUpperCase() === code && c.active)
    console.log(`[API:ADVANCE_CODES:VALIDATE] Validating code "${code}" -> ${found ? 'VALID' : 'INVALID'}`)
    if (!found) return NextResponse.json({ valid: false })

    return NextResponse.json({
      valid: true,
      code: found.code,
      percentage: found.percentage,
      fixedAmount: found.fixedAmount,
    })
  }

  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  console.log(`[API:ADVANCE_CODES:LIST] Manager ${guard.user.id} fetching all advance codes`)
  return NextResponse.json(await getAdvanceCodes(admin))
}

/**
 * Handles POST /api/advance-codes
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - Inbound request body.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePostAdvanceCode(admin, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
  if (!code || code.length < 3)
    return NextResponse.json({ error: 'Code must be at least 3 characters' }, { status: 400 })

  const percentage =
    body.percentage !== undefined && body.percentage !== null && body.percentage !== ''
      ? Number(body.percentage)
      : body.fixedAmount
      ? null
      : 50
  const fixedAmount = body.fixedAmount ? Number(body.fixedAmount) : null

  if (percentage !== null && (isNaN(percentage) || percentage < 1 || percentage > 100)) {
    return NextResponse.json({ error: 'Advance percentage must be between 1% and 100%' }, { status: 400 })
  }
  if (fixedAmount !== null && (isNaN(fixedAmount) || fixedAmount <= 0)) {
    return NextResponse.json({ error: 'Fixed advance amount must be a positive number' }, { status: 400 })
  }

  const codes = await getAdvanceCodes(admin)
  if (codes.some((c) => c.code === code))
    return NextResponse.json({ error: 'Code already exists' }, { status: 400 })

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

  console.log(
    `[API:ADVANCE_CODES:CREATED] Code "${code}" (${percentage ? `${percentage}%` : `₹${fixedAmount}`}) created by ${guard.user.id}`
  )
  return NextResponse.json(newEntry, { status: 201 })
}

/**
 * Handles DELETE /api/advance-codes/:id
 *
 * @param {Object} admin - Supabase admin client.
 * @param {string} id    - Advance code ID or code string.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleDeleteAdvanceCode(admin, id, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const codes = await getAdvanceCodes(admin)
  const targetCode = codes.find((c) => c.id === id || c.code === id)
  const nextCodes = codes.filter((c) => c.id !== id && c.code !== id)
  await saveAdvanceCodes(admin, nextCodes)

  console.log(`[API:ADVANCE_CODES:DELETED] Advance code ${targetCode?.code || id} deleted by ${guard.user.id}`)
  sendAdminConfigAlert({
    category: 'Advance Deposit Codes',
    action: `Advance Code Deleted: "${targetCode?.code || id}"`,
    changedBy: guard.user.email,
    role: guard.user.role || 'manager',
    details: {
      'Deleted Code': targetCode?.code || id,
      'Deposit Required': targetCode?.depositAmount ? `₹${targetCode.depositAmount}` : '—',
      'Description': targetCode?.description || 'Custom advance payment voucher',
      'Status': 'Permanently deleted from system',
    },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json({ ok: true, id })
}
