/**
 * @file short-stays-panel.model.js
 * @description Data model and duration rates structure for short stays.
 */

export const ShortStayRooms = [
  { key: 'masterBedroomShortStay', label: 'Master Bedroom', defaultRate: 3500 },
  { key: 'villa2BHKShortStay', label: '2 BHK Private Pool Villa', defaultRate: 8500 },
  { key: 'villa4BHKShortStay', label: '4 BHK Luxury Estate', defaultRate: 16000 },
]

export const ShortStayDefaults = {
  TITLE: 'Day-Use / Short Stay Management',
  SUBTITLE: 'Hourly accommodation rates & same-day bookings ledger',
}
