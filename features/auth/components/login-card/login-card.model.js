/**
 * @file login-card.model.js
 * @description State interface and default labels for the LoginCard component.
 */

export const LoginCardDefaults = {
  TITLE: 'Administrative Gateway',
  SUBTITLE: 'Authorized access to Siddhi Farm operations & booking management.',
  TIMEOUT_MESSAGE: 'Session expired due to inactivity. Please sign in again.',
  SUBMIT_BUTTON_TEXT: 'Authenticate & Proceed',
}

/**
 * Validates login input state
 * @param {Object} state
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateLoginInput({ email, password }) {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email address is required' }
  }
  if (!password || !password.trim()) {
    return { valid: false, error: 'Password is required' }
  }
  return { valid: true }
}
