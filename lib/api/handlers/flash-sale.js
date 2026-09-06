/**
 * ============================================================================
 * FLASH SALE DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles promotional flash sale campaign queries, poster uploads,
 *                and administrative schedule updates with owner email alerts.
 *
 * @module        lib/api/handlers/flash-sale
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/api/guards'
import { sendAdminConfigAlert } from '@/lib/booking-email'
import { resolveActiveOrUpcomingSale, evaluateAnnualSales } from '@/features/flash-sale/models/flash-sale.model'

/**
 * Parses datetime string with Indian Standard Time (IST) offset handling.
 *
 * @param {string} dtStr
 * @returns {Date|null}
 */
function parseIndianDateTime(dtStr) {
  if (!dtStr) return null
  const str = String(dtStr).trim()
  if (!str) return null
  if (!/([+-]\d{2}:?\d{2}|Z)$/i.test(str)) {
    const withOffset = str.length === 16 ? `${str}:00+05:30` : `${str}+05:30`
    const d = new Date(withOffset)
    if (!isNaN(d.getTime())) return d
  }
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Handles GET /api/flash-sale
 * Evaluates both ad-hoc flash sales and the 4 annual recurring sales
 * (Republic Day, Independence Day, Christmas, New Year).
 *
 * @param {Object} admin - Supabase admin client.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetFlashSale(admin) {
  const { data } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'flash_sale')
    .maybeSingle()

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
    annualSales: {},
  }

  const annualConfig = sale.annualSales || {}
  const now = new Date()

  // Evaluate active or upcoming promotion (custom flash sale or 4 annual recurring sales)
  const resolved = resolveActiveOrUpcomingSale(sale, annualConfig, now)

  console.log(
    `[API:FLASH_SALE:GET] Promotion query: ${resolved.active ? (resolved.isLive ? 'LIVE NOW' : 'UPCOMING TEASER') : 'INACTIVE'} (IsAnnual: ${resolved.isAnnual}, Sale: ${resolved.sale?.name || 'None'}, ServerUTC: ${now.toISOString()})`
  )

  return NextResponse.json(
    {
      active: resolved.active,
      isLive: resolved.isLive,
      isTeaser: resolved.isTeaser,
      isAnnual: resolved.isAnnual,
      sale: resolved.sale,
      config: sale,
      annualSchedule: resolved.annualSchedule,
      serverTime: now.toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  )
}

/**
 * Handles POST /api/flash-sale (Save/schedule promotional flash sale campaign & annual sales)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - Inbound request body.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePostFlashSale(admin, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { data: prevSaleRow } = await admin
    .from('settings')
    .select('value')
    .eq('key', 'flash_sale')
    .maybeSingle()
  const prevSale = prevSaleRow?.value || {}

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
    annualSales: body.annualSales || prevSale.annualSales || {},
    updatedAt: new Date().toISOString(),
    updatedBy: guard.user.email,
  }

  const { error } = await admin.from('settings').upsert({
    key: 'flash_sale',
    value: saleConfig,
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(
    `[API:FLASH_SALE:SAVED] Flash sale updated by ${guard.user.email} (Enabled: ${saleConfig.enabled}, Value: ${saleConfig.discountValue} ${saleConfig.discountType}, AnnualSalesConfigured: ${Boolean(body.annualSales)})`
  )

  const diffs = {}
  if (Boolean(prevSale.enabled) !== Boolean(saleConfig.enabled)) {
    diffs['Campaign Status'] = `${prevSale.enabled ? '🟢 Live/Scheduled' : '🔴 Disabled'} ➔ ${saleConfig.enabled ? '🟢 Activated & Live' : '🔴 Deactivated'}`
  }
  if ((prevSale.name || '') !== saleConfig.name) {
    diffs['Campaign Name'] = `"${prevSale.name || '(None)'}" ➔ "${saleConfig.name || '(None)'}"`
  }
  if (
    Number(prevSale.discountValue) !== saleConfig.discountValue ||
    prevSale.discountType !== saleConfig.discountType
  ) {
    const oldD = prevSale.discountValue
      ? prevSale.discountType === 'fixed'
        ? `₹${prevSale.discountValue} Flat`
        : `${prevSale.discountValue}%`
      : 'None'
    const newD = saleConfig.discountValue
      ? saleConfig.discountType === 'fixed'
        ? `₹${saleConfig.discountValue} Flat`
        : `${saleConfig.discountValue}%`
      : 'None'
    diffs['Discount Offer'] = `${oldD} ➔ ${newD}`
  }
  if (
    (prevSale.startDateTime || '') !== saleConfig.startDateTime ||
    (prevSale.endDateTime || '') !== saleConfig.endDateTime
  ) {
    diffs['Schedule Window'] = `Starts: ${saleConfig.startDateTime ? new Date(saleConfig.startDateTime).toLocaleString('en-IN') : 'Immediately'} | Ends: ${saleConfig.endDateTime ? new Date(saleConfig.endDateTime).toLocaleString('en-IN') : 'Indefinite'}`
  }
  if ((prevSale.imageUrl || '') !== saleConfig.imageUrl) {
    diffs['Poster Banner'] = saleConfig.imageUrl
      ? 'Custom Poster Uploaded/Changed'
      : 'Poster Removed'
  }
  if ((prevSale.bannerMessage || '') !== saleConfig.bannerMessage) {
    diffs['Announcement Text'] = `"${prevSale.bannerMessage || '—'}" ➔ "${saleConfig.bannerMessage || '—'}"`
  }

  const hasDiffs = Object.keys(diffs).length > 0
  sendAdminConfigAlert({
    category: 'Flash Sales & Promotions',
    action: saleConfig.enabled
      ? `Flash Sale Campaign Activated: "${saleConfig.name || 'Promotional Deal'}"`
      : `Flash Sale Campaign Deactivated`,
    changedBy: guard.user.email,
    role: guard.user.role || 'manager',
    details: hasDiffs
      ? diffs
      : { Status: 'Configuration saved with no operational parameter changes' },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json({ ok: true, config: saleConfig })
}

/**
 * Handles POST /api/flash-sale/upload (Multipart poster image file upload)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Request} req  - Inbound HTTP request with FormData.
 * @returns {Promise<NextResponse>}
 */
export async function handleUploadFlashSaleBanner(admin, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const form = await req.formData()
  const file = form.get('file')
  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'Banner image file is required' }, { status: 400 })
  if (!file.type?.startsWith('image/'))
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
  if (file.size > 8 * 1024 * 1024)
    return NextResponse.json({ error: 'Image must be under 8MB' }, { status: 400 })

  console.log(`[API:FLASH_SALE:IMAGE_UPLOAD] Uploading promotional banner by ${guard.user.id}`)
  await admin.storage.createBucket('site-images', { public: true }).catch(() => {})
  const ext =
    (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const objectPath = `flash-sale-banner-${Date.now()}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('site-images')
    .upload(objectPath, bytes, { contentType: file.type, upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
  const { data: pub } = admin.storage.from('site-images').getPublicUrl(objectPath)

  return NextResponse.json({ url: pub.publicUrl })
}
