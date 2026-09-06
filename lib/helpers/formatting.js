/**
 * ============================================================================
 * FORMATTING HELPERS & SHARED CONSTANTS
 * ============================================================================
 *
 * @fileoverview  Pure utility functions for time, currency, and duration
 *                formatting, plus shared business-domain constants used across
 *                both customer-facing and admin UI components.
 *
 * @module        lib/helpers/formatting
 * @author        Rushikesh Nigade
 * @design-pattern Utility / Helper Module — stateless, side-effect-free
 *                functions that can be safely imported from any layer.
 *
 * NAMING CONVENTIONS:
 *  - camelCase for all exported functions and constants.
 *  - UPPER_SNAKE_CASE only for true compile-time constants (none here yet).
 *  - Array-tuples use descriptive positional comments for readability.
 * ============================================================================
 */

// ─── EXPERIENCE CARDS CONFIGURATION ─────────────────────────────────────────
/**
 * Ordered list of resort experience offerings displayed on the homepage grid.
 * Each tuple: [slug, displayTitle, shortDescription, pricingKey, unitLabel]
 *
 * @type {Array<[string, string, string, string, string]>}
 */
export const EXPERIENCES = [
  ['farm-stays', 'Farm stays', 'Wake up to birdsong in our spacious master bedrooms and private villas.', 'masterBedroom', 'per night'],
  ['one-day-tour', 'One Day Tour', 'A relaxed countryside day with lunch and open-lawn play. No overnight required.', 'oneDayTour', 'per person'],
  ['mini-water-park', 'Mini Water Park', 'Splash-worthy fun with slides, kid zones and shaded seating for parents.', 'miniWaterPark', 'per person'],
  ['get-together', 'Get-Togethers', 'Spacious open lawns and shaded banquet areas perfect for family reunions and alumni gatherings.', 'getTogetherEvent', 'per event'],
  ['birthday-party', 'Birthday & Naming Ceremony', 'Joyful celebration setups with music, dining, and scenic poolside backdrops.', 'birthdayEvent', 'per event'],
  ['wedding-ceremony', 'Wedding & Engagement', 'Breathtaking countryside open-air ceremonies, mandap lawns and memorable celebrations.', 'weddingEvent', 'per event'],
]

// ─── STAY / ACCOMMODATION CARDS CONFIGURATION ───────────────────────────────
/**
 * Ordered list of room/villa accommodation cards.
 * Each tuple: [slug, displayNumber, title, tagline, pricingKey, imageKey]
 *
 * @type {Array<[string, string, string, string, string, string]>}
 */
export const STAY_CARDS = [
  ['master-bedroom', '01', 'Master bedrooms', 'A calm, comfortable base for slow mornings.', 'masterBedroom', 'stayMasterBedroom'],
  ['2-bhk-villa', '02', '2 BHK Villa', 'Your own spacious hideaway for family time.', 'villa2BHK', 'stayVilla2BHK'],
  ['4-bhk-villa', '03', '4 BHK Villa', 'Room to bring everyone you love.', 'villa4BHK', 'stayVilla4BHK'],
]

// ─── SERVICE NAME → PRICING KEY MAP ─────────────────────────────────────────
/**
 * Maps user-friendly service display names (used in dropdowns) to their
 * corresponding Supabase `pricing` table keys.
 *
 * @type {Record<string, string>}
 */
export const SERVICE_KEYS = {
  'Master Bedroom': 'masterBedroom',
  '2 BHK Villa': 'villa2BHK',
  '4 BHK Villa': 'villa4BHK',
  'One Day Tour': 'oneDayTour',
  'Mini Water Park': 'miniWaterPark',
  'Wedding Ceremony': 'weddingEvent',
  'Engagement Ceremony': 'engagementEvent',
  'Birthday Party': 'birthdayEvent',
  'Get Together': 'getTogetherEvent',
}

// ─── HOMEPAGE STATS ─────────────────────────────────────────────────────────
/**
 * Static property highlights displayed in the stats bar below the hero section.
 * Each tuple: [value, label]
 *
 * @type {Array<[string, string]>}
 */
export const PROPERTY_STATS = [
  ['03', 'Master bedrooms'],
  ['02', 'Private villas'],
  ['01', 'Beautiful farm'],
  ['∞', 'Ways to unwind'],
]

// ─── GALLERY ITEMS ──────────────────────────────────────────────────────────
/**
 * Photo gallery image configuration for the homepage gallery grid.
 * Each tuple: [imageKey, altLabel]
 *
 * @type {Array<[string, string]>}
 */
export const GALLERY_ITEMS = [
  ['gallery1', 'Farmhouse'],
  ['gallery2', 'Villa bedroom'],
  ['gallery3', 'Swimming pool'],
  ['gallery4', 'Restaurant'],
  ['gallery5', 'Party lawn'],
  ['gallery6', 'Kids adventure'],
]

// ─── NAV LINKS ──────────────────────────────────────────────────────────────
/**
 * Desktop and mobile navigation anchor links.
 * Each tuple: [href, label]
 *
 * @type {Array<[string, string]>}
 */
export const NAV_LINKS = [
  ['#stay', 'Stay'],
  ['#experiences', 'Experiences'],
  ['#story', 'Our story'],
  ['#contact', 'Contact'],
]

// ─── FORMATTING FUNCTIONS ───────────────────────────────────────────────────

/**
 * Converts a 24-hour time string (e.g. "14:30") to 12-hour format ("2:30 PM").
 *
 * @param   {string|null|undefined} timeStr - Time in "HH:MM" 24-hour format.
 * @returns {string} Formatted 12-hour string, or empty string if input is falsy.
 *
 * @example
 *   formatTime12h('14:30')  // → "2:30 PM"
 *   formatTime12h('09:05')  // → "9:05 AM"
 *   formatTime12h(null)     // → ""
 */
export function formatTime12h(timeStr) {
  if (!timeStr) return ''
  const [h, m] = String(timeStr).split(':').map(Number)
  if (isNaN(h)) return timeStr
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m || 0).padStart(2, '0')} ${suffix}`
}

/**
 * Calculates the elapsed hours between two 24-hour time strings.
 * Used for "Short Stay / Day-Use" duration display in the booking form.
 *
 * @param   {string} inStr  - Check-in time ("HH:MM"), defaults to "11:00".
 * @param   {string} outStr - Check-out time ("HH:MM"), defaults to "15:00".
 * @returns {string} Human-readable duration (e.g. "4 Hours") or "Custom" if invalid.
 *
 * @example
 *   calculateHoursDuration('11:00', '15:00')  // → "4 Hours"
 *   calculateHoursDuration('10:00', '15:30')  // → "5.5 Hours"
 */
export function calculateHoursDuration(inStr, outStr) {
  const [inH, inM] = (inStr || '11:00').split(':').map(Number)
  const [outH, outM] = (outStr || '15:00').split(':').map(Number)
  const diffMinutes = (outH * 60 + outM) - (inH * 60 + inM)
  if (diffMinutes <= 0) return 'Custom'
  const hours = diffMinutes / 60
  return Number.isInteger(hours) ? `${hours} Hours` : `${hours.toFixed(1)} Hours`
}

/**
 * Formats a numeric amount as an Indian Rupee string with locale separators.
 *
 * @param   {number} amount - The numeric amount to format.
 * @returns {string} Locale-formatted currency string (e.g. "9,000").
 *
 * @example
 *   formatINR(9000)   // → "9,000"
 *   formatINR(15000)  // → "15,000"
 */
export function formatINR(amount) {
  return Number(amount).toLocaleString('en-IN')
}

/**
 * Formats a 12-hour display time from booking data, with a fallback value.
 * Primarily used in Admin dashboard to display booking check-in/out times.
 *
 * @param   {string|null} value    - The stored time value from the database.
 * @param   {string}      fallback - Fallback time if value is null/undefined.
 * @returns {string} Formatted 12-hour time string.
 *
 * @example
 *   displayBookingTime('14:30', '11:00')  // → "2:30 PM"
 *   displayBookingTime(null, '10:00')     // → "10:00 AM"
 */
export function displayBookingTime(value, fallback) {
  const [hours, minutes] = String(value || fallback).split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes || 0).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}
