export const BOOKING_TERMS_VERSION = '2026-08-16'

export const BOOKING_TERMS = [
  'A reservation is confirmed only after the required payment is received and the resort confirms the booking.',
  'Every guest must present a valid government photo ID at check-in. Entry may be refused for unregistered guests.',
  'Standard check-in is from 11:00 AM and check-out is by 10:00 AM. Early check-in or late check-out depends on availability and may be chargeable.',
  'Only the number of guests shown on the booking may stay or enter. Extra guests need prior approval and applicable payment.',
  'Guests are responsible for damage, missing items, excessive cleaning, or loss caused by their party. Recovery charges may apply.',
  'Illegal activity, weapons, fireworks, smoking in rooms, dangerous conduct, and disturbance to other guests are prohibited. The resort may end a stay without refund for a serious breach.',
  'For the Mini Water Park, children must be supervised by a responsible adult and all safety instructions from staff must be followed. Activities are used at the guest’s own risk.',
  'Cancellation, date changes, and refunds are subject to the resort’s written confirmation and applicable policy.',
]

/** Uses the saved admin configuration when available, with safe defaults. */
export function normaliseBookingTerms(value) {
  const terms = Array.isArray(value?.terms)
    ? value.terms.map(term => String(term || '').trim()).filter(Boolean).slice(0, 30)
    : []
  const version = String(value?.version || '').trim().slice(0, 40)

  return {
    version: version || BOOKING_TERMS_VERSION,
    terms: terms.length ? terms : BOOKING_TERMS,
  }
}
