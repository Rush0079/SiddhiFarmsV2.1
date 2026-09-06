/**
 * ============================================================================
 * PRICING DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles GET and POST operations for resort rate-card pricing:
 *                - GET /api/pricing: Public retrieval of current active rates.
 *                - POST /api/pricing: Role-protected (manager, super_admin) rate update
 *                  with change diff calculation and owner security alert dispatch.
 *
 * @module        lib/api/handlers/pricing
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import { cleanPricing, requireRole } from '@/lib/api/guards'
import { sendAdminConfigAlert } from '@/lib/booking-email'

const LABEL_MAP = {
  masterBedroom: 'Master Bedroom (Overnight)',
  villa2BHK: '2 BHK Villa (Overnight)',
  villa4BHK: '4 BHK Villa (Overnight)',
  masterBedroomShortStay: 'Master Bedroom (Short Stay)',
  villa2BHKShortStay: '2 BHK Villa (Short Stay)',
  villa4BHKShortStay: '4 BHK Villa (Short Stay)',
  oneDayTour: 'One Day Tour (Per Person)',
  miniWaterPark: 'Mini Water Park (Per Person)',
  weddingEvent: 'Wedding Event Package',
  engagementEvent: 'Engagement Event Package',
  birthdayEvent: 'Birthday Event Package',
  getTogetherEvent: 'Get-Together Event Package',
}

/**
 * Handles GET /api/pricing
 *
 * @param {Object} admin - Supabase admin client.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetPricing(admin) {
  console.log('[API:PRICING:GET] Fetching active pricing schedule')
  const { data } = await admin.from('pricing').select('values').eq('id', 'current').single()
  return NextResponse.json(cleanPricing(data?.values))
}

/**
 * Handles POST /api/pricing
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - Inbound request body with updated rate card.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePostPricing(admin, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  // Fetch previous rates to compute exact diff
  const { data: previousRow } = await admin
    .from('pricing')
    .select('values')
    .eq('id', 'current')
    .maybeSingle()
  const prevRates = cleanPricing(previousRow?.values)
  const values = cleanPricing(body)

  const diffs = {}
  for (const [k, label] of Object.entries(LABEL_MAP)) {
    const oldVal = prevRates[k] !== undefined ? Number(prevRates[k]) : null
    const newVal = values[k] !== undefined ? Number(values[k]) : null
    if (oldVal !== newVal) {
      if (oldVal !== null) {
        const diffAmount = newVal - oldVal
        const diffStr =
          diffAmount > 0
            ? `+₹${diffAmount.toLocaleString('en-IN')}`
            : `-₹${Math.abs(diffAmount).toLocaleString('en-IN')}`
        diffs[label] = `₹${oldVal.toLocaleString('en-IN')} ➔ ₹${newVal.toLocaleString('en-IN')} (${diffStr})`
      } else {
        diffs[label] = `₹${newVal.toLocaleString('en-IN')} (Initial setup)`
      }
    }
  }

  const { error } = await admin
    .from('pricing')
    .upsert({ id: 'current', values, updated_at: new Date().toISOString() })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  console.log(`[API:PRICING:UPDATED] Pricing updated by ${guard.user.id}`)

  const hasDiffs = Object.keys(diffs).length > 0
  sendAdminConfigAlert({
    category: 'Pricing Matrix',
    action: hasDiffs
      ? `Rates Changed on ${Object.keys(diffs).length} item(s)`
      : 'Pricing Rates Re-saved',
    changedBy: guard.user.email,
    role: guard.user.role || 'manager',
    details: hasDiffs
      ? diffs
      : { Status: 'All prices re-confirmed with no numeric modifications' },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json(values)
}
