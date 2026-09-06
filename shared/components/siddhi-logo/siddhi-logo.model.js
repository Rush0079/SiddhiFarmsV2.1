/**
 * @file siddhi-logo.model.js
 * @description Data model and variant specifications for SiddhiLogo.
 */

export const SiddhiLogoVariants = {
  ICON: 'icon',
  FULL: 'full',
  NAV: 'nav',
}

export const SiddhiLogoBrand = {
  NAME: 'SIDDHI FARMS',
  TAGLINE: 'FARM & RESORT · PUNE',
}

/**
 * Validates if the variant is supported
 * @param {string} variant
 * @returns {boolean}
 */
export function isValidLogoVariant(variant) {
  return Object.values(SiddhiLogoVariants).includes(variant)
}
