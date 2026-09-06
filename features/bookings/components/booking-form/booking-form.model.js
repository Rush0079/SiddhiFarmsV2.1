/**
 * @file booking-form.model.js
 * @description Model contracts, duration presets, and steps for BookingForm.
 */

export const BookingFormSteps = {
  DETAILS: 1,
  PRICING: 2,
  PAYMENT: 3,
  CONFIRMATION: 4,
}

export const SHORT_STAY_PRESETS = [
  { hours: 3, label: '3 Hours', desc: 'Quick Refresh' },
  { hours: 6, label: '6 Hours', desc: 'Half Day' },
  { hours: 9, label: '9 Hours', desc: 'Extended Day' },
  { hours: 12, label: '12 Hours', desc: 'Full Day Outing' },
]

export const BookingFormDefaults = {
  TITLE: 'Reserve Your Experience',
  SUBTITLE: 'Select dates, guests, and preferences to book your luxury stay.',
}
