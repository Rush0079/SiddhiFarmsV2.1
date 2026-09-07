/**
 * ============================================================================
 * IMAGES CMS DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles image slot URL overrides, Supabase storage bucket uploads,
 *                and retrieving configured site image overrides.
 *
 * @module        lib/api/handlers/images
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import { IMAGE_DEFAULTS } from '@/lib/siteImages'
import { requireRole, getImageOverrides, saveImageOverrides } from '@/lib/api/guards'

/**
 * Handles GET /api/images
 *
 * @param {Object} admin - Supabase admin client.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetImages(admin) {
  console.log('[API:IMAGES:GET] Fetching image CMS configuration')
  return NextResponse.json(await getImageOverrides(admin))
}

/**
 * Handles POST /api/images
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - Inbound request body { key, url }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePostImages(admin, body, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const key = String(body.key || '')
  if (!(key in IMAGE_DEFAULTS))
    return NextResponse.json({ error: 'Unknown image slot' }, { status: 400 })

  const url = String(body.url || '').trim()
  if (url && !/^(https?:\/\/|\/)/.test(url))
    return NextResponse.json({ error: 'URL must start with http(s):// or /' }, { status: 400 })

  const values = await getImageOverrides(admin)
  if (url) values[key] = url
  else delete values[key]

  const { error } = await saveImageOverrides(admin, values)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[API:IMAGES:OVERRIDE] Slot "${key}" updated by ${guard.user.id}`)
  return NextResponse.json({ key, url: url || null })
}

/**
 * Handles POST /api/images/upload (Multipart upload)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Request} req  - Inbound HTTP request with FormData.
 * @returns {Promise<NextResponse>}
 */
export async function handleUploadImage(admin, req) {
  const guard = await requireRole(['manager', 'super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const form = await req.formData()
  const file = form.get('file')
  const key = String(form.get('key') || '')

  if (!file || typeof file === 'string')
    return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
  if (!(key in IMAGE_DEFAULTS))
    return NextResponse.json({ error: 'Unknown image slot' }, { status: 400 })
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedMimeTypes.includes(file.type?.toLowerCase()))
    return NextResponse.json({ error: 'Only JPG, PNG, WEBP, and GIF images are allowed' }, { status: 400 })
  if (file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: 'Image must be under 5MB' }, { status: 400 })

  console.log(`[API:IMAGES:UPLOAD] Uploading image for slot "${key}" by ${guard.user.id}`)
  await admin.storage.createBucket('site-images', { public: true }).catch(() => {})
  const ext =
    (file.name?.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const objectPath = `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.${ext}`
  const bytes = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage
    .from('site-images')
    .upload(objectPath, bytes, { contentType: file.type, upsert: true })
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
