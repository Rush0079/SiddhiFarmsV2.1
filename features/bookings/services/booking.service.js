/**
 * @file booking.service.js
 * @description API service for managing bookings, date availability, and reservation lifecycles.
 */

export class BookingService {
  /**
   * Fetch all bookings for admin management
   * @returns {Promise<{ success: boolean, bookings?: Array, error?: string }>}
   */
  static async getBookings() {
    try {
      console.log('[BOOKING:SERVICE:GET_ALL] Fetching reservations')
      const res = await fetch('/api/bookings', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to fetch bookings' }
      }
      return { success: true, bookings: data.bookings || data || [] }
    } catch (err) {
      console.error('[BOOKING:SERVICE:ERROR]', err)
      return { success: false, error: err.message }
    }
  }

  /**
   * Update reservation status (confirm, cancel, etc.)
   * @param {string} bookingId
   * @param {string} status
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  static async updateStatus(bookingId, status) {
    try {
      console.log(`[BOOKING:SERVICE:UPDATE] Updating booking ${bookingId} to ${status}`)
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (!res.ok) {
        return { success: false, error: data.error || 'Status update failed' }
      }
      return { success: true }
    } catch (err) {
      console.error('[BOOKING:SERVICE:UPDATE_FAIL]', err)
      return { success: false, error: err.message }
    }
  }

  /**
   * Check if requested dates are available
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {Promise<{ available: boolean, error?: string }>}
   */
  static async checkAvailability(checkIn, checkOut) {
    try {
      const params = new URLSearchParams({ checkIn, checkOut })
      const res = await fetch(`/api/availability?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        return { available: false, error: data.error }
      }
      return { available: Boolean(data.available) }
    } catch (err) {
      return { available: false, error: 'Availability check failed' }
    }
  }
}
