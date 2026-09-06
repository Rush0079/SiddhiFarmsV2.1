/**
 * @file auth.service.js
 * @description Authentication service managing credentials verification, OTP requests, and session creation.
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export class AuthService {
  /**
   * Verify email and password via Supabase Auth
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<{ success: boolean, user?: Object, error?: string }>}
   */
  static async verifyCredentials({ email, password }) {
    try {
      console.log(`[AUTH:SERVICE:VERIFY] Authenticating ${email}`)
      const supabase = createSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, user: data.user, session: data.session }
    } catch (err) {
      console.error('[AUTH:SERVICE:ERROR]', err)
      return { success: false, error: err.message || 'Authentication failed' }
    }
  }

  /**
   * Request 2FA OTP for a verified user
   * @param {Object} payload
   * @param {string} payload.email
   * @param {string} [payload.captchaToken]
   * @returns {Promise<{ success: boolean, maskedEmail?: string, maskedPhone?: string, error?: string }>}
   */
  static async requestTwoFactorOtp({ email, captchaToken }) {
    try {
      console.log(`[AUTH:SERVICE:OTP_REQUEST] Requesting 2FA OTP for ${email}`)
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), captchaToken }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to dispatch 2FA OTP' }
      }

      return {
        success: true,
        maskedEmail: data.maskedEmail,
        maskedPhone: data.maskedPhone,
      }
    } catch (err) {
      console.error('[AUTH:SERVICE:OTP_REQUEST_FAIL]', err)
      return { success: false, error: 'Network error communicating with OTP service' }
    }
  }

  /**
   * Verify 2FA OTP code
   * @param {Object} payload
   * @param {string} payload.email
   * @param {string} payload.otpCode
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async verifyTwoFactorOtp({ email, otpCode }) {
    try {
      console.log(`[AUTH:SERVICE:OTP_VERIFY] Verifying OTP for ${email}`)
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otpCode.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'Invalid OTP code' }
      }

      return { success: true }
    } catch (err) {
      console.error('[AUTH:SERVICE:OTP_VERIFY_FAIL]', err)
      return { success: false, error: 'Verification error' }
    }
  }

  /**
   * Sign out user and clean session tokens
   */
  static async signOut() {
    try {
      const supabase = createSupabaseBrowserClient()
      await supabase.auth.signOut().catch(() => {})
      document.cookie = 'siddhi_2fa_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0; SameSite=Lax;'
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
