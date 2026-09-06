/**
 * @file flash-sale.service.js
 * @description API service for managing flash sale campaigns and timers.
 */

export class FlashSaleService {
  /**
   * Fetch active flash sale campaign
   * @returns {Promise<{ success: boolean, flashSale?: Object, error?: string }>}
   */
  static async getActiveFlashSale() {
    try {
      const res = await fetch('/api/flash-sale', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) return { success: false, error: data.error }
      return { success: true, flashSale: data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  /**
   * Save flash sale configuration
   * @param {Object} payload
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async saveFlashSale(payload) {
    try {
      const res = await fetch('/api/flash-sale', {
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
}
