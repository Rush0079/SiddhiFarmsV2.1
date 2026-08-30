import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { supabaseAdmin } from '@/lib/supabase/admin'

const RESORT_NAME = 'Siddhi Farm Resort'
const OTP_EXPIRY_MINUTES = 10

function getMailConfig() {
  const user = process.env.GMAIL_USER?.trim()
  const appPassword = (process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD)?.trim()
  const owners = (process.env.OWNER_EMAILS || process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return { user, appPassword, owners }
}

function cleanPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits
}

/**
 * Generates a 6-digit OTP code and persists its hash in database/settings
 * @param {object} params
 * @param {string} params.email - Target email
 * @param {string} [params.phone] - Target phone
 * @param {string} params.purpose - 'admin_login' | 'create_admin' | 'change_role'
 * @param {object} [params.metadata] - Extra context (e.g. target new admin email, role)
 */
export async function generateAndSendOTP({ email, phone, purpose, metadata = {} }) {
  const admin = supabaseAdmin()
  const cleanEmail = String(email || '').trim().toLowerCase()
  if (!cleanEmail) throw new Error('Email is required for OTP verification')

  // Generate 6-digit numeric OTP
  const otpCode = String(crypto.randomInt(100000, 999999))
  const otpHash = crypto.createHash('sha256').update(`${cleanEmail}:${otpCode}:${purpose}`).digest('hex')
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString()

  // Persist OTP record in Supabase settings
  const storageKey = `otp_${purpose}_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`
  const otpRecord = {
    email: cleanEmail,
    phone: phone ? cleanPhone(phone) : null,
    purpose,
    hash: otpHash,
    expiresAt,
    attempts: 0,
    metadata,
    createdAt: new Date().toISOString(),
  }

  await admin.from('settings').upsert({
    key: storageKey,
    value: otpRecord,
    updated_at: new Date().toISOString(),
  })

  // Dispatch via Email
  const emailPromise = sendOTPEmail({
    to: cleanEmail,
    otpCode,
    purpose,
    metadata,
    expiresMinutes: OTP_EXPIRY_MINUTES,
  })

  // Dispatch via WhatsApp / SMS if phone is provided or available
  let cleanTargetPhone = phone ? cleanPhone(phone) : null
  if (!cleanTargetPhone) {
    // Check if user has phone in profiles
    const { data: profile } = await admin.from('profiles').select('phone').eq('email', cleanEmail).maybeSingle()
    if (profile?.phone) cleanTargetPhone = cleanPhone(profile.phone)
  }

  const whatsappPromise = cleanTargetPhone
    ? sendOTPWhatsApp({ phone: cleanTargetPhone, otpCode, purpose, metadata })
    : Promise.resolve({ sent: false, reason: 'no-phone' })

  const [emailRes, whatsappRes] = await Promise.allSettled([emailPromise, whatsappPromise])

  console.log(`[OTP:DISPATCHED] OTP generated for ${cleanEmail} (${purpose}) - Email: ${emailRes.status}, WhatsApp: ${whatsappRes.status}`)

  return {
    sent: true,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    maskedEmail: maskEmail(cleanEmail),
    maskedPhone: cleanTargetPhone ? maskPhone(cleanTargetPhone) : null,
  }
}

/**
 * Verifies a submitted OTP against stored hash
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.otpCode
 * @param {string} params.purpose
 */
export async function verifyOTP({ email, otpCode, purpose }) {
  const admin = supabaseAdmin()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const code = String(otpCode || '').trim()

  if (!cleanEmail || !code || code.length !== 6) {
    return { valid: false, reason: 'Invalid or missing 6-digit verification code' }
  }

  const storageKey = `otp_${purpose}_${cleanEmail.replace(/[^a-z0-9]/g, '_')}`
  const { data } = await admin.from('settings').select('value').eq('key', storageKey).maybeSingle()
  const record = data?.value

  if (!record || !record.hash) {
    return { valid: false, reason: 'No active verification code found. Please request a new code.' }
  }

  // Check Expiry
  if (new Date(record.expiresAt) < new Date()) {
    await admin.from('settings').delete().eq('key', storageKey)
    return { valid: false, reason: 'Verification code has expired. Please request a new one.' }
  }

  // Check Attempt Limits (max 5 attempts)
  if ((record.attempts || 0) >= 5) {
    await admin.from('settings').delete().eq('key', storageKey)
    return { valid: false, reason: 'Too many incorrect attempts. Code invalidated for security.' }
  }

  // Compute Submitted Hash
  const expectedHash = crypto.createHash('sha256').update(`${cleanEmail}:${code}:${purpose}`).digest('hex')
  if (record.hash !== expectedHash) {
    // Increment attempts
    await admin.from('settings').update({
      value: { ...record, attempts: (record.attempts || 0) + 1 },
      updated_at: new Date().toISOString(),
    }).eq('key', storageKey)

    return {
      valid: false,
      reason: `Incorrect verification code. (${4 - (record.attempts || 0)} attempts remaining)`,
    }
  }

  // Success: invalidate single-use OTP
  await admin.from('settings').delete().eq('key', storageKey)
  console.log(`[OTP:VERIFIED] Successfully verified OTP for ${cleanEmail} (${purpose})`)
  return { valid: true, metadata: record.metadata || {} }
}

/**
 * Sends formatted OTP email via Nodemailer
 */
async function sendOTPEmail({ to, otpCode, purpose, metadata = {}, expiresMinutes = 10 }) {
  const { user, appPassword } = getMailConfig()
  if (!user || !appPassword) {
    console.warn(`[OTP:EMAIL_SKIPPED] Gmail credentials not set. OTP Code: ${otpCode}`)
    return { sent: false, reason: 'gmail-not-configured' }
  }

  const purposeTitles = {
    admin_login: 'Admin Sign-in Two-Factor Verification',
    create_admin: 'Super Admin Authorization: New Admin Setup',
    change_role: 'Super Admin Authorization: User Role Change',
  }

  const title = purposeTitles[purpose] || 'Security Verification Code'
  const actionDescription = purpose === 'admin_login'
    ? 'An administrator login attempt was initiated for your resort staff/admin account.'
    : purpose === 'create_admin'
    ? `A request was made by Super Admin to provision a new team account for <strong>${metadata.targetEmail || 'new user'}</strong> with role <strong>${metadata.targetRole || 'staff'}</strong>.`
    : 'A request was made by Super Admin to update administrative user roles.'

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f3f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:540px;margin:auto;background:#ffffff;border:1px solid #dbe4d7;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,0.06)">
    <div style="padding:24px;background:#173d35;color:#ffffff;text-align:center">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#d5b36a">🔐 Two-Factor Authentication</div>
      <h1 style="margin:8px 0 0;font-size:20px;font-weight:600">${title}</h1>
    </div>
    <div style="padding:28px 24px;color:#1f2937;text-align:center">
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:#475569;text-align:left">
        ${actionDescription} Use the 6-digit verification code below to authorize this action:
      </p>

      <div style="margin:24px auto;padding:16px 24px;background:#f4f7f2;border:2px dashed #315d4c;border-radius:12px;display:inline-block">
        <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#173d35;font-family:Consolas,Monaco,monospace">${otpCode}</span>
      </div>

      <p style="margin:16px 0 0;font-size:12px;color:#64748b">
        ⏱️ This verification code is valid for <strong>${expiresMinutes} minutes</strong> and can only be used once.
      </p>

      <div style="margin-top:28px;padding:12px;background:#fff8e6;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#92400e;text-align:left">
        ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. Resort team members will never ask for your verification code. If you did not initiate this request, change your password immediately.
      </div>
    </div>
    <div style="padding:14px 24px;background:#fbfdfa;border-top:1px solid #eef2eb;text-align:center;font-size:11px;color:#94a3b8">
      ${RESORT_NAME} Operations &amp; Security Desk
    </div>
  </div>
</body>
</html>`

  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } })
  await transporter.sendMail({
    from: `${RESORT_NAME} Security <${process.env.GMAIL_FROM?.trim() || user}>`,
    to,
    subject: `[Security Code] ${otpCode} is your ${RESORT_NAME} verification code`,
    html,
  })

  return { sent: true }
}

/**
 * Sends OTP via WhatsApp / SMS using WhatsApp gateway
 */
async function sendOTPWhatsApp({ phone, otpCode, purpose, metadata = {} }) {
  if (!phone) return { sent: false }

  const actionText = purpose === 'admin_login'
    ? 'sign into the Admin Dashboard'
    : purpose === 'create_admin'
    ? `authorize provisioning of admin account for ${metadata.targetEmail || 'new user'}`
    : 'authorize administrative role updates'

  const message = [
    `🔐 *${RESORT_NAME.toUpperCase()} SECURITY VERIFICATION*`,
    `─────────────────────────────`,
    `Your 6-digit authorization code is:`,
    ``,
    `👉 *${otpCode}* 👈`,
    ``,
    `Use this code to ${actionText}.`,
    `⏱️ Valid for 10 minutes. Do NOT share this code with anyone.`,
    `─────────────────────────────`,
  ].join('\n')

  // 1. Meta WhatsApp Cloud API if configured
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const endpoint = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { preview_url: false, body: message },
        }),
      })
      if (res.ok) {
        console.log(`[OTP:WHATSAPP_SUCCESS] OTP sent via WhatsApp to ${phone}`)
        return { sent: true, provider: 'meta-cloud-api' }
      }
    } catch (err) {
      console.warn(`[OTP:WHATSAPP_WARN] Failed WhatsApp dispatch to ${phone}:`, err.message)
    }
  }

  // 2. Fast2SMS Indian SMS Gateway if configured
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const raw10Digits = phone.startsWith('91') && phone.length === 12 ? phone.slice(2) : phone
      const smsRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otpCode,
          numbers: raw10Digits,
        }),
      })
      if (smsRes.ok) {
        console.log(`[OTP:SMS_SUCCESS] Fast2SMS OTP dispatched to ${raw10Digits}`)
        return { sent: true, provider: 'fast2sms' }
      }
    } catch (err) {
      console.warn(`[OTP:SMS_WARN] Fast2SMS dispatch failed:`, err.message)
    }
  }

  return { sent: false, reason: 'no-gateway-configured' }
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return email
  const [user, domain] = email.split('@')
  const maskedUser = user.length <= 2 ? `${user[0]}*` : `${user[0]}${'*'.repeat(user.length - 2)}${user[user.length - 1]}`
  return `${maskedUser}@${domain}`
}

function maskPhone(phone) {
  if (!phone || phone.length < 6) return phone
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`
}
