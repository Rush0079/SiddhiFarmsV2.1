/**
 * @file coupon.service.js
 * @description API service for managing promotional coupons and single-use advance deposit codes.
 */

export class CouponService {
  /**
   * Fetch all active promotional coupons
   * @returns {Promise<{ success: boolean, coupons?: Array, error?: string }>}
   */
  static async getCoupons() {
    try {
      const res = await fetch('/api/coupons', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true, coupons: data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Fetch active advance deposit codes
   * @returns {Promise<{ success: boolean, codes?: Array, error?: string }>}
   */
  static async getAdvanceCodes() {
    try {
      const res = await fetch('/api/advance-codes', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true, codes: data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Create a new single-use advance deposit code
   * @param {Object} payload
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async createAdvanceCode(payload) {
    try {
      const res = await fetch('/api/advance-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Delete an advance deposit code
   * @param {string} id
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async deleteAdvanceCode(id) {
    try {
      const res = await fetch(`/api/advance-codes?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
