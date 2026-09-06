/**
 * @file payment.service.js
 * @description API service for managing payment gateways, UPI claims, and gateway settings.
 */

export class PaymentService {
  /**
   * Fetch current payment fallback configurations
   * @returns {Promise<{ success: boolean, config?: Object, error?: string }>}
   */
  static async getConfig() {
    try {
      const res = await fetch('/api/payments/config', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true, config: data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Submit guest UPI payment claim
   * @param {Object} payload
   * @param {string} payload.bookingId
   * @param {string} payload.reference
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async claimUpiPayment({ bookingId, reference }) {
    try {
      const res = await fetch('/api/payments/upi-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, reference: (reference || '').trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return { success: false, error: data.error || 'Could not record payment' }
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Update payment fallback configuration
   * @param {Object} config
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async updateConfig(config) {
    try {
      const res = await fetch('/api/payments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
