/**
 * @file auth.model.js
 * @description Data models, enums, and validation helpers for the Authentication feature.
 */

export const AuthStep = {
  CREDENTIALS: 'credentials',
  OTP: 'otp',
}

export const AuthRoles = {
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  STAFF: 'staff',
}

export const AuthConfig = {
  LOCKOUT_THRESHOLD: 3,
  LOCKOUT_DURATION_SECONDS: 30,
  OTP_LENGTH: 6,
  OTP_EXPIRY_SECONDS: 600,
  RESEND_COOLDOWN_SECONDS: 30,
}

/**
 * Validates email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Validates 6-digit OTP format
 * @param {string} code
 * @returns {boolean}
 */
export function isValidOtpCode(code) {
  if (!code || typeof code !== 'string') return false
  return /^\d{6}$/.test(code.trim())
}

/**
 * Masks an email for privacy display
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || ''
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local.charAt(0)}***@${domain}`
  return `${local.charAt(0)}***${local.charAt(local.length - 1)}@${domain}`
}
