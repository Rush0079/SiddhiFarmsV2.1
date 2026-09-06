/**
 * @file payment.model.js
 * @description Data model and schemas for Razorpay and Direct UPI payments.
 */

export const PaymentMethod = {
  RAZORPAY: 'razorpay',
  UPI: 'upi',
}

export const PaymentClaimStatus = {
  IDLE: 'idle',
  SENDING: 'sending',
  DONE: 'done',
  ERROR: 'error',
}

/**
 * Builds UPI deep-link URI for mobile checkout
 * @param {Object} options
 * @param {string} options.upiId
 * @param {string} options.upiName
 * @param {number} options.amount
 * @param {string} options.bookingId
 * @returns {string|null}
 */
export function buildUpiDeepLink({ upiId, upiName = 'Siddhi Farm Resort', amount, bookingId }) {
  if (!upiId) return null
  const safeAmount = Number(amount) || 0
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${safeAmount}&cu=INR&tn=${encodeURIComponent(`Booking ${bookingId}`)}`
}
