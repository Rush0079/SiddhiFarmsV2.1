/**
 * @file booking.model.js
 * @description Domain models, statuses, and validation schemas for Bookings.
 */

export const BookingStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
}

export const StayType = {
  FULL_DAY: 'full_day',
  SHORT_STAY: 'short_stay',
  DAY_OUTING: 'day_outing',
}

export const BookingDefaults = {
  CHECKIN_TIME: '14:00',
  CHECKOUT_TIME: '11:00',
  DEFAULT_GUESTS: 2,
  MAX_GUESTS: 15,
}

/**
 * Validates basic booking requirements
 * @param {Object} bookingData
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBookingRequest(bookingData = {}) {
  const { customerName, phone, checkIn, checkOut, guests } = bookingData

  if (!customerName || !customerName.trim()) {
    return { valid: false, error: 'Customer name is required' }
  }
  if (!phone || !/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
    return { valid: false, error: 'A valid 10-digit phone number is required' }
  }
  if (!checkIn) {
    return { valid: false, error: 'Check-in date is required' }
  }
  if (!checkOut) {
    return { valid: false, error: 'Check-out date is required' }
  }
  if (new Date(checkOut) < new Date(checkIn)) {
    return { valid: false, error: 'Check-out date cannot precede check-in date' }
  }
  if (!guests || Number(guests) < 1) {
    return { valid: false, error: 'At least 1 guest must be specified' }
  }

  return { valid: true }
}

/**
 * Computes stay nights duration
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @returns {number}
 */
export function calculateStayNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1
  const start = new Date(checkIn).getTime()
  const end = new Date(checkOut).getTime()
  const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24))
  return Math.max(1, diffDays)
}
