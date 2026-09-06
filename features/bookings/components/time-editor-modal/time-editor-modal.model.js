/**
 * @file time-editor-modal.model.js
 * @description Data model, time validation, and defaults for TimeEditorModal.
 */

export const TimeEditorDefaults = {
  TITLE: 'Set Stay Times',
  SUBTITLE: 'Booking schedule',
  DESCRIPTION: 'Standard timings are 11:00 AM check-in and 10:00 AM check-out. The saved times appear on the customer invoice.',
  DEFAULT_CHECKIN: '11:00',
  DEFAULT_CHECKOUT: '10:00',
}

/**
 * Validates HH:mm time string
 * @param {string} time
 * @returns {boolean}
 */
export function isValidTimeString(time) {
  if (!time || typeof time !== 'string') return false
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time.trim())
}
