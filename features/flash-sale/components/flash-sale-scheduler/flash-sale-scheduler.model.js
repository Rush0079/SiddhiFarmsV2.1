/**
 * @file flash-sale-scheduler.model.js
 * @description Data model, service options, and defaults for the FlashSaleScheduler admin component.
 */

import { ANNUAL_SALES_DEFINITIONS } from '../../models/flash-sale.model.js'

export const FlashSaleServiceOptions = [
  ['all', 'All Stays & Services'],
  ['Master Bedroom', 'Master Bedroom'],
  ['2 BHK Villa', '2 BHK Villa'],
  ['4 BHK Villa', '4 BHK Villa'],
  ['One Day Tour', 'One Day Tour'],
  ['Mini Water Park', 'Mini Water Park'],
  ['Wedding Ceremony', 'Wedding / Events'],
]

export const FlashSaleSchedulerDefaults = {
  TITLE: 'Promotional Flash Sale Campaign',
  SUBTITLE: 'Campaign Scheduler',
  DESCRIPTION: 'Deploy high-visibility promotional banners with live countdown timers and auto-applied discounts across the booking panel.',
  ANNUAL_TITLE: 'Annual Recurring Holiday Sales',
  ANNUAL_SUBTITLE: 'Automated 4-Season Sales Engine',
  ANNUAL_DESCRIPTION: 'Automatically runs 4 times every year (Republic Day, Independence Day, Christmas, New Year). Appears on the website 15 days prior with a 10-day active sale duration. Manage discounts and custom messages below.',
  SAVE_BUTTON_TEXT: 'Save & Deploy Campaign',
}

export function getAnnualSalesDefinitions() {
  return ANNUAL_SALES_DEFINITIONS
}
