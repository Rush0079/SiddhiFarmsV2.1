/**
 * ============================================================================
 * ADMIN USERS & 2FA AUTHENTICATION DOMAIN API HANDLER
 * ============================================================================
 *
 * @fileoverview  Handles administrative user provisioning, role assignments,
 *                two-factor authentication (2FA) challenges, and team account deletion.
 *
 * @module        lib/api/handlers/admin-users
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/api/guards'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  generateAndSendOTP,
  verifyOTP,
  create2FASessionToken,
} from '@/lib/otp-service'
import { sendAdminConfigAlert } from '@/lib/booking-email'

/**
 * Validates password complexity requirements:
 * - Minimum 10 characters length
 * - At least one uppercase letter (A-Z)
 * - At least one numeric digit (0-9)
 * - At least one special character (!@#$%^&* etc.)
 *
 * @param {string} password - Raw candidate password
 * @returns {string|null} Error string if invalid, null if valid
 */
export function validatePasswordComplexity(password) {
  if (!password || typeof password !== 'string') return 'Password is required.'
  if (password.length < 10) return 'Password must be at least 10 characters long.'
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter (A-Z).'
  if (!/[0-9]/.test(password)) return 'Password must contain at least one digit (0-9).'
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    return 'Password must contain at least one special character (e.g. !@#$%^&*).'
  }
  return null
}

/**
 * Handles GET /api/admin/customers (User profiles list)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetCustomers(admin, req) {
  const guard = await requireRole(['super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  console.log(`[API:ADMIN:CUSTOMERS] Super Admin ${guard.user.id} fetching user profiles`)
  const { data: users, error } = await admin
    .from('profiles')
    .select('id, email, full_name, role, phone, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(users || [])
}

/**
 * Handles PATCH /api/admin/customers (Update role)
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { userId, role }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handlePatchCustomerRole(admin, body, req) {
  const guard = await requireRole(['super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { userId, role } = body
  if (!userId || !['customer', 'staff', 'manager'].includes(role)) {
    return NextResponse.json({ error: 'Valid userId and role are required' }, { status: 400 })
  }

  // Prevent modifying the root super admin
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('role, email')
    .eq('id', userId)
    .single()
  if (targetProfile?.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot modify primary Super Admin account' }, { status: 403 })
  }

  const { error } = await admin
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[API:ADMIN:ROLE_CHANGED] User ${userId} (${targetProfile?.email}) promoted/changed to ${role} by ${guard.user.id}`)

  sendAdminConfigAlert({
    category: 'User Management',
    action: `User Role Changed: ${targetProfile?.email || userId}`,
    changedBy: guard.user.email,
    role: 'super_admin',
    details: {
      'User Email': targetProfile?.email || userId,
      'Previous Role': (targetProfile?.role || 'customer').toUpperCase(),
      'New Role': role.toUpperCase(),
      Action: 'Role updated in profiles table',
    },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json({ ok: true, userId, role })
}

/**
 * Handles DELETE /api/admin/customers/:id
 *
 * @param {Object} admin       - Supabase admin client.
 * @param {string} id          - User profile UID.
 * @param {Request} req        - Inbound HTTP request.
 * @param {boolean} deleteUser - Whether to permanently purge the Supabase auth user.
 * @returns {Promise<NextResponse>}
 */
export async function handleDeleteCustomer(admin, id, req, deleteUser = false) {
  const guard = await requireRole(['super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  // Guard: root admin cannot be demoted or deleted
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', id)
    .single()
  if (targetProfile?.role === 'super_admin') {
    return NextResponse.json({ error: 'Primary Super Admin account cannot be modified' }, { status: 403 })
  }

  if (deleteUser) {
    // Delete profile record and permanently delete the Supabase Auth user
    await admin.from('profiles').delete().eq('id', id)
    const { error: authDelErr } = await admin.auth.admin.deleteUser(id)
    if (authDelErr) {
      console.error(`[API:ADMIN:USER_DELETE_ERROR] Failed deleting auth user ${id}:`, authDelErr.message)
      return NextResponse.json({ error: authDelErr.message }, { status: 500 })
    }
    console.log(`[API:ADMIN:USER_DELETED] User ${id} (${targetProfile?.email}) permanently purged by ${guard.user.id}`)

    sendAdminConfigAlert({
      category: 'User Management',
      action: `User Account Deleted: ${targetProfile?.email || id}`,
      changedBy: guard.user.email,
      role: 'super_admin',
      details: {
        'User Email': targetProfile?.email || id,
        'Full Name': targetProfile?.full_name || '—',
        'Previous Role': (targetProfile?.role || 'customer').toUpperCase(),
        Action: 'Account permanently purged from authentication & database',
      },
    }).catch((err) => console.error('[ALERT:ERROR]', err))

    return NextResponse.json({ ok: true, id, deleted: true })
  }

  // Otherwise demote to customer
  const { error } = await admin
    .from('profiles')
    .update({ role: 'customer', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  console.log(`[API:ADMIN:USER_DEMOTED] User ${id} demoted to customer by ${guard.user.id}`)
  return NextResponse.json({ ok: true, id, demoted: true })
}

/**
 * Handles POST /api/admin/auth-otp/request
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { action, targetEmail, targetRole }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleRequestAuthOtp(admin, body, req) {
  const guard = await requireRole(['super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { action = 'create_admin', targetEmail, targetRole } = body
  const otpRes = await generateAndSendOTP({
    email: guard.user.email,
    phone: guard.profile?.phone,
    purpose: 'create_admin',
    metadata: { targetEmail, targetRole, requestedBy: guard.user.email },
  })

  return NextResponse.json({
    ok: true,
    maskedEmail: otpRes.maskedEmail,
    maskedPhone: otpRes.maskedPhone,
    expiresInSeconds: otpRes.expiresInSeconds,
  })
}

/**
 * Handles POST /api/admin/create-user
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { name, email, password, role, phone, superAdminOtp }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleCreateUser(admin, body, req) {
  const guard = await requireRole(['super_admin'], req)
  if (guard.error) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { name, email, password, role, phone, superAdminOtp } = body
  if (!name || !email || !password)
    return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })

  if (!superAdminOtp || String(superAdminOtp).trim().length !== 6) {
    return NextResponse.json(
      { error: 'Super Admin 6-digit authorization OTP is required to create a new team account.' },
      { status: 400 }
    )
  }

  const verifyRes = await verifyOTP({
    email: guard.user.email,
    otpCode: superAdminOtp,
    purpose: 'create_admin',
  })
  if (!verifyRes.valid) {
    return NextResponse.json(
      { error: `Super Admin Authorization Failed: ${verifyRes.reason}` },
      { status: 403 }
    )
  }

  // Enforce password complexity
  const pwError = validatePasswordComplexity(password)
  if (pwError) return NextResponse.json({ error: pwError }, { status: 400 })

  // Only staff & manager accounts can be provisioned
  if (!['staff', 'manager'].includes(role)) {
    return NextResponse.json(
      {
        error:
          'Invalid role. New accounts can only be created as Staff or Manager. The primary Super Admin is unique.',
      },
      { status: 400 }
    )
  }

  console.log(`[API:ADMIN:CREATE_USER] Super Admin authorized account creation for ${email} with role "${role}"`)
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: name.trim() },
  })

  if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })

  // Upsert profile record
  await admin.from('profiles').upsert({
    id: newUser.user.id,
    email: email.trim().toLowerCase(),
    full_name: name.trim(),
    role,
    phone: phone?.trim() || null,
    updated_at: new Date().toISOString(),
  })

  sendAdminConfigAlert({
    category: 'User Management',
    action: `New Team Member Created: ${email}`,
    changedBy: guard.user.email,
    role: 'super_admin',
    details: {
      'Full Name': name.trim(),
      Email: email.trim().toLowerCase(),
      'Assigned Role': role.toUpperCase(),
      Phone: phone?.trim() || '—',
      Authorization: 'Verified via Super Admin 2FA OTP',
    },
  }).catch((err) => console.error('[ALERT:ERROR]', err))

  return NextResponse.json(
    { ok: true, id: newUser.user.id, email: newUser.user.email, role },
    { status: 201 }
  )
}

/**
 * Handles GET /api/auth/me
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleAuthMe(admin, req) {
  const guard = await requireRole(['customer', 'staff', 'manager', 'super_admin'], req)
  if (guard.error)
    return NextResponse.json({ authenticated: false, error: guard.error }, { status: guard.status })

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

/**
 * Handles POST /api/auth/2fa/send
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { email }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleAuth2FaSend(admin, body, req) {
  const clientIp = getClientIp(req)
  const limit = checkRateLimit(clientIp, '2fa_send', 10, 5 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many verification requests. Please wait ${limit.resetInSeconds}s.` },
      { status: 429 }
    )
  }

  const email = String(body.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const { data: profile } = await admin
    .from('profiles')
    .select('email, phone, role, full_name')
    .eq('email', email)
    .maybeSingle()
  const role = profile?.role || 'customer'
  const isAdminRole = ['staff', 'manager', 'super_admin'].includes(role)

  if (!isAdminRole) {
    return NextResponse.json({ requires2FA: false, role })
  }

  const otpRes = await generateAndSendOTP({
    email: profile.email,
    phone: profile.phone,
    purpose: 'admin_login',
    metadata: { role, full_name: profile.full_name },
  })

  return NextResponse.json({
    requires2FA: true,
    role,
    maskedEmail: otpRes.maskedEmail,
    maskedPhone: otpRes.maskedPhone,
    expiresInSeconds: otpRes.expiresInSeconds,
  })
}

/**
 * Handles POST /api/auth/2fa/verify
 *
 * @param {Object} admin - Supabase admin client.
 * @param {Object} body  - { email, otpCode }.
 * @param {Request} req  - Inbound HTTP request.
 * @returns {Promise<NextResponse>}
 */
export async function handleAuth2FaVerify(admin, body, req) {
  const clientIp = getClientIp(req)
  const limit = checkRateLimit(clientIp, '2fa_verify', 15, 5 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Please wait ${limit.resetInSeconds}s.` },
      { status: 429 }
    )
  }

  const email = String(body.email || '').trim().toLowerCase()
  const otpCode = String(body.otpCode || '').trim()

  const verifyRes = await verifyOTP({ email, otpCode, purpose: 'admin_login' })
  if (!verifyRes.valid) {
    return NextResponse.json({ error: verifyRes.reason }, { status: 400 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle()
  const sessionToken = await create2FASessionToken({
    userId: profile?.id || 'admin',
    email: profile?.email || email,
    role: profile?.role || 'staff',
  })

  const response = NextResponse.json({ ok: true, verified: true })
  response.cookies.set('siddhi_2fa_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 hours
  })

  return response
}

/**
 * Handles GET /api/me
 * Returns current authenticated Supabase SSR user and their database profile.
 *
 * @param {Object} admin - Supabase admin client.
 * @returns {Promise<NextResponse>}
 */
export async function handleGetMe(admin) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ user: null })
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  return NextResponse.json({ user, profile })
}
