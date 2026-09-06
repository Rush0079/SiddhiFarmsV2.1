/**
 * @file features/content-cms/models/content.model.js
 * @description Domain models and validation for content CMS and booking terms.
 */

export const ContentDefaults = {
  DEFAULT_TERMS_VERSION: '2026',
  DEFAULT_TERMS: [
    'Check-in time is 1:00 PM and check-out time is 11:00 AM.',
    'Government ID proof is mandatory for all guests upon arrival.',
    'Advance payment is non-refundable if cancelled within 48 hours of check-in.',
    'Smoking is strictly prohibited inside the cottages; designated outdoor areas are available.',
    'Please respect nature and avoid loud music post 10:00 PM.'
  ]
};

/**
 * Validates terms and conditions input
 * @param {Object} termsObj - { version, terms }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBookingTerms(termsObj) {
  const errors = [];
  if (!termsObj || typeof termsObj !== 'object') {
    errors.push('Terms payload must be an object');
    return { valid: false, errors };
  }
  if (!termsObj.version || typeof termsObj.version !== 'string' || !termsObj.version.trim()) {
    errors.push('Terms version is required');
  }
  if (!Array.isArray(termsObj.terms) || termsObj.terms.length === 0) {
    errors.push('At least one term condition is required');
  }
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalizes raw terms from API or fallback
 * @param {Object|null} raw 
 * @returns {{ version: string, terms: string[] }}
 */
export function normalizeTerms(raw) {
  if (!raw) {
    return {
      version: ContentDefaults.DEFAULT_TERMS_VERSION,
      terms: [...ContentDefaults.DEFAULT_TERMS]
    };
  }
  return {
    version: raw.version || ContentDefaults.DEFAULT_TERMS_VERSION,
    terms: Array.isArray(raw.terms) && raw.terms.length > 0 ? raw.terms : [...ContentDefaults.DEFAULT_TERMS]
  };
}
