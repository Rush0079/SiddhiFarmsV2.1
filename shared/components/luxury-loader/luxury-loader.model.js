/**
 * @file luxury-loader.model.js
 * @description Data model and default configuration for LuxuryLoader.
 */

export const LuxuryLoaderDefaults = {
  PAGE_TITLE: 'Siddhi Farm Resort',
  PAGE_SUBTITLE: 'Loading experience...',
  OVERLAY_TITLE: 'Authenticating...',
  OVERLAY_SUBTITLE: 'Redirecting to your dashboard',
  PROGRESS_MESSAGE: 'Securing session token & initializing environment',
}

/**
 * Validates loader props
 * @param {Object} props
 * @returns {boolean}
 */
export function validateLoaderProps(props = {}) {
  if (typeof props !== 'object' || props === null) return false
  return true
}
