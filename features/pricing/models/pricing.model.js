/**
 * @file pricing.model.js
 * @description Data models, service keys, and rate definitions for resort pricing.
 */

export const ServiceRateKeys = {
  MASTER_BEDROOM: 'masterBedroom',
  VILLA_2BHK: 'villa2BHK',
  VILLA_4BHK: 'villa4BHK',
  MASTER_BEDROOM_SHORT_STAY: 'masterBedroomShortStay',
  VILLA_2BHK_SHORT_STAY: 'villa2BHKShortStay',
  VILLA_4BHK_SHORT_STAY: 'villa4BHKShortStay',
  ONE_DAY_TOUR: 'oneDayTour',
  MINI_WATER_PARK: 'miniWaterPark',
  WEDDING_EVENT: 'weddingEvent',
  ENGAGEMENT_EVENT: 'engagementEvent',
  BIRTHDAY_EVENT: 'birthdayEvent',
  GET_TOGETHER_EVENT: 'getTogetherEvent',
}

export const ServiceLabels = {
  masterBedroom: 'Master bedroom (Overnight)',
  villa2BHK: '2 BHK villa (Overnight)',
  villa4BHK: '4 BHK villa (Overnight)',
  masterBedroomShortStay: 'Master bedroom (Short Stay / Day-Use)',
  villa2BHKShortStay: '2 BHK villa (Short Stay / Day-Use)',
  villa4BHKShortStay: '4 BHK villa (Short Stay / Day-Use)',
  oneDayTour: 'One day tour',
  miniWaterPark: 'One day tour + mini water park',
  weddingEvent: 'Wedding event',
  engagementEvent: 'Engagement event',
  birthdayEvent: 'Birthday event',
  getTogetherEvent: 'Get-together event',
}

/**
 * Validates custom rate input
 * @param {Object} rate
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCustomRate(rate = {}) {
  if (!rate.key || !rate.key.trim()) {
    return { valid: false, error: 'Rate key identifier is required' }
  }
  if (!rate.label || !rate.label.trim()) {
    return { valid: false, error: 'Rate display label is required' }
  }
  if (isNaN(Number(rate.value)) || Number(rate.value) < 0) {
    return { valid: false, error: 'Rate price must be a non-negative number' }
  }
  return { valid: true }
}
