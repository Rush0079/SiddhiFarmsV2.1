/**
 * @file session-timeout.model.js
 * @description Inactivity constants and session management model.
 */

export const SessionTimeoutConfig = {
  INACTIVITY_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes
  STORAGE_KEY: 'siddhi_admin_last_active',
  HEARTBEAT_INTERVAL_MS: 5000,
  WRITE_THROTTLE_MS: 2000,
  COOKIE_NAME: 'siddhi_2fa_session',
}

/**
 * Checks if inactivity duration exceeded threshold
 * @param {number} lastActiveTime
 * @param {number} currentTime
 * @param {number} timeoutMs
 * @returns {boolean}
 */
export function isSessionExpired(lastActiveTime, currentTime = Date.now(), timeoutMs = SessionTimeoutConfig.INACTIVITY_TIMEOUT_MS) {
  if (!lastActiveTime || lastActiveTime <= 0) return false
  return (currentTime - lastActiveTime) >= timeoutMs
}
