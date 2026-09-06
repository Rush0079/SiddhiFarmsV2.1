/**
 * @file two-factor-auth.model.js
 * @description Data model and prop contracts for the TwoFactorAuth component.
 */

export const TwoFactorAuthDefaults = {
  TITLE: 'Two-Factor Authentication',
  DESCRIPTION: 'A one-time verification code has been dispatched to your authorized channels.',
  VERIFY_BUTTON_TEXT: 'Verify & Enter Dashboard',
  RESEND_BUTTON_TEXT: 'Resend Verification Code',
}

/**
 * Format remaining countdown seconds to mm:ss
 * @param {number} seconds
 * @returns {string}
 */
export function formatCountdown(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}
