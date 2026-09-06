/**
 * ============================================================================
 * BOOKING TERMS DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles retrieval and administrative updates of resort terms & conditions.
 *
 * @module        lib/api/handlers/terms
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import { requireRole, getBookingTerms, saveBookingTerms } from '@/lib/api/guards'
import { sendAdminConfigAlert } from '@/lib/booking-email'

/**
 * Handles GET /api/booking-terms
 *
 * @param {Object} admin - Supabase admin client.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetTerms(admin) {
  console.log('[API:TERMS:GET] Fetching resort booking terms')
  return NextResponse.json(await getBookingTerms(admin))
}

/**
 * Handles POST /api/booking-terms
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - Inbound request body with version and terms array.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePostTerms(admin, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const terms = Array.isArray(body.terms)
    ? body.terms.map((term) => String(term || '').trim()).filter(Boolean).slice(0, 30)
    : []
  const version = String(body.version || '').trim().slice(0, 40)
  if (!version || !terms.length) {
    return NextResponse.json({ error: 'Add a version and at least one term' }, { status: 400 })
  }

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
      Version: version,
      'Total Terms': `${terms.length} clauses`,
      Summary: terms.slice(0, 4).join(' | '),
    },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json(value)
}
