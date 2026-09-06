/**
 * @file pricing.service.js
 * @description API service for managing resort rate cards and custom packages.
 */

export class PricingService {
  /**
   * Fetch current pricing configuration
   * @returns {Promise<{ success: boolean, pricing?: Object, error?: string }>}
   */
  static async getPricing() {
    try {
      console.log('[PRICING:SERVICE:GET] Fetching rate card')
      const res = await fetch('/api/pricing', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to fetch rates' }
      }
      return { success: true, pricing: data }
    } catch (err) {
      console.error('[PRICING:SERVICE:ERROR]', err)
      return { success: false, error: err.message }
    }
  }

  /**
   * Save updated pricing configuration
   * @param {Object} pricingMap
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async updatePricing(pricingMap) {
    try {
      console.log('[PRICING:SERVICE:UPDATE] Saving rates')
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingMap),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'Save rates failed' }
      }
      return { success: true }
    } catch (err) {
      console.error('[PRICING:SERVICE:UPDATE_FAIL]', err)
      return { success: false, error: err.message }
    }
  }
}
