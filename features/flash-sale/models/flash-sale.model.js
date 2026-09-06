/**
 * @file flash-sale.model.js
 * @description Data model, annual recurring schedule definitions, and active status checks.
 */

export const FlashSaleDiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
}

/**
 * The 4 Annual Scheduled Recurring Sales:
 * 1. Republic Day Sale (Starts Jan 25 · 10 days duration · 15 days prior teaser from Jan 10)
 * 2. Independence Day Sale (Starts Aug 14 · 10 days duration · 15 days prior teaser from July 30)
 * 3. Christmas Sale (Starts Dec 24 · 10 days duration · 15 days prior teaser from Dec 9)
 * 4. New Year Sale (Starts Dec 30 · 10 days duration · 15 days prior teaser from Dec 15)
 */
export const ANNUAL_SALES_DEFINITIONS = [
  {
    id: 'republic_day',
    name: 'Republic Day Special Sale',
    badgeText: '🇮🇳 REPUBLIC DAY SALE',
    startMonth: 1, // January
    startDay: 25,
    durationDays: 10, // 25th Jan through 3rd Feb
    teaserDaysPrior: 15, // Visible from 10th Jan
    defaultDiscountValue: 10,
    defaultDiscountType: 'percentage',
    defaultBannerMessage: 'Republic Day Long Weekend Sale: Enjoy 10% OFF all resort stays & private pool villas!',
    anchorHoliday: '26th January (Republic Day)',
    description: 'Annual Republic Day holiday sale (Starts 25th Jan for 10 days, visible 15 days prior).'
  },
  {
    id: 'independence_day',
    name: 'Independence Day Grand Sale',
    badgeText: '🇮🇳 INDEPENDENCE SALE',
    startMonth: 8, // August
    startDay: 14,
    durationDays: 10, // 14th Aug through 23rd Aug
    teaserDaysPrior: 15, // Visible from 30th July
    defaultDiscountValue: 10,
    defaultDiscountType: 'percentage',
    defaultBannerMessage: 'Independence Day Holiday Sale: Enjoy 10% OFF all resort stays & private pool villas!',
    anchorHoliday: '15th August (Independence Day)',
    description: 'Annual Independence Day holiday sale (Starts 14th Aug for 10 days, visible 15 days prior).'
  },
  {
    id: 'christmas',
    name: 'Christmas Festive Holiday Sale',
    badgeText: '🎄 CHRISTMAS SALE',
    startMonth: 12, // December
    startDay: 24,
    durationDays: 10, // 24th Dec through 2nd Jan
    teaserDaysPrior: 15, // Visible from 9th Dec
    defaultDiscountValue: 10,
    defaultDiscountType: 'percentage',
    defaultBannerMessage: 'Christmas Magic at Siddhi: Enjoy 10% OFF all resort stays & luxury villas!',
    anchorHoliday: '25th December (Christmas)',
    description: 'Annual Christmas holiday sale (Starts 24th Dec for 10 days, visible 15 days prior).'
  },
  {
    id: 'new_year',
    name: 'New Year Celebration Bonanza',
    badgeText: '🎆 NEW YEAR SALE',
    startMonth: 12, // December
    startDay: 30,
    durationDays: 10, // 30th Dec through 8th Jan
    teaserDaysPrior: 15, // Visible from 15th Dec
    defaultDiscountValue: 10,
    defaultDiscountType: 'percentage',
    defaultBannerMessage: 'Ring in the New Year: Enjoy 10% OFF all resort stays & poolside villas!',
    anchorHoliday: '1st January (New Year)',
    description: 'Annual New Year holiday celebration sale (Starts 30th Dec for 10 days, visible 15 days prior).'
  }
]

/**
 * Calculates start, end, and teaser Date objects for a given annual sale definition and year.
 * Timezone is anchored to Indian Standard Time (IST, UTC+5:30).
 *
 * @param {Object} saleDef
 * @param {number} year
 * @returns {{ startDate: Date, endDate: Date, teaserDate: Date }}
 */
export function getAnnualSaleDates(saleDef, year) {
  const pad = (n) => String(n).padStart(2, '0')
  const startStr = `${year}-${pad(saleDef.startMonth)}-${pad(saleDef.startDay)}T00:00:00+05:30`
  const startDate = new Date(startStr)

  // End date: startDate + durationDays * 24h - 1 second
  const endDate = new Date(startDate.getTime() + saleDef.durationDays * 24 * 60 * 60 * 1000 - 1000)

  // Teaser date: startDate - teaserDaysPrior * 24h
  const teaserDate = new Date(startDate.getTime() - saleDef.teaserDaysPrior * 24 * 60 * 60 * 1000)

  return { startDate, endDate, teaserDate }
}

/**
 * Evaluates all 4 annual sales for the given time and returns their current state.
 *
 * @param {Object} annualConfig - Admin configuration overrides for each sale keyed by ID.
 * @param {Date}   [currentTime=new Date()]
 * @returns {{ activeAnnualSale: Object|null, scheduleList: Array }}
 */
export function evaluateAnnualSales(annualConfig = {}, currentTime = new Date()) {
  const now = currentTime instanceof Date ? currentTime : new Date(currentTime)
  const currentYear = now.getFullYear()
  const candidateYears = [currentYear - 1, currentYear, currentYear + 1]

  let activeLiveSale = null
  let activeTeaserSale = null
  const scheduleList = []

  for (const def of ANNUAL_SALES_DEFINITIONS) {
    const userOverride = annualConfig[def.id] || {}
    const isEnabled = userOverride.enabled !== undefined ? Boolean(userOverride.enabled) : true
    const discountValue = Number(userOverride.discountValue ?? def.defaultDiscountValue) || 10
    const discountType = userOverride.discountType || def.defaultDiscountType
    const bannerMessage = userOverride.bannerMessage?.trim() || def.defaultBannerMessage
    const badgeText = userOverride.badgeText?.trim() || def.badgeText
    const name = userOverride.name?.trim() || def.name
    const applicableServices = userOverride.applicableServices || 'all'

    // Find current or nearest occurrence across candidate years
    let bestOccurrence = null
    let minTimeDiff = Infinity

    for (const yr of candidateYears) {
      const { startDate, endDate, teaserDate } = getAnnualSaleDates(def, yr)
      const nowMs = now.getTime()
      const isLive = nowMs >= startDate.getTime() && nowMs <= endDate.getTime()
      const isTeaser = nowMs >= teaserDate.getTime() && nowMs < startDate.getTime()

      if (isLive) {
        bestOccurrence = {
          year: yr,
          startDate,
          endDate,
          teaserDate,
          state: 'live',
        }
        break
      }

      if (isTeaser && (!bestOccurrence || bestOccurrence.state !== 'live')) {
        bestOccurrence = {
          year: yr,
          startDate,
          endDate,
          teaserDate,
          state: 'teaser',
        }
        break
      }

      // If upcoming in the future
      if (startDate.getTime() > nowMs) {
        const diff = startDate.getTime() - nowMs
        if (diff < minTimeDiff) {
          minTimeDiff = diff
          bestOccurrence = {
            year: yr,
            startDate,
            endDate,
            teaserDate,
            state: 'scheduled',
          }
        }
      }
    }

    if (!bestOccurrence) {
      const { startDate, endDate, teaserDate } = getAnnualSaleDates(def, currentYear + 1)
      bestOccurrence = {
        year: currentYear + 1,
        startDate,
        endDate,
        teaserDate,
        state: 'scheduled',
      }
    }

    const saleRecord = {
      ...def,
      enabled: isEnabled,
      discountValue,
      discountType,
      bannerMessage,
      badgeText,
      name,
      applicableServices,
      state: bestOccurrence.state,
      startDateIso: bestOccurrence.startDate.toISOString(),
      endDateIso: bestOccurrence.endDate.toISOString(),
      teaserDateIso: bestOccurrence.teaserDate.toISOString(),
      isLive: isEnabled && bestOccurrence.state === 'live',
      isTeaser: isEnabled && bestOccurrence.state === 'teaser',
    }

    scheduleList.push(saleRecord)

    if (isEnabled) {
      if (saleRecord.isLive && !activeLiveSale) {
        activeLiveSale = saleRecord
      } else if (saleRecord.isTeaser && !activeTeaserSale) {
        activeTeaserSale = saleRecord
      }
    }
  }

  return {
    activeAnnualSale: activeLiveSale || activeTeaserSale || null,
    scheduleList,
  }
}

/**
 * Resolves which promotion (manual ad-hoc campaign or annual holiday campaign) is active or in teaser.
 *
 * @param {Object} customFlashSale
 * @param {Object} annualConfig
 * @param {Date}   [currentTime=new Date()]
 * @returns {{ active: boolean, isTeaser: boolean, isLive: boolean, sale: Object|null, annualSchedule: Array }}
 */
export function resolveActiveOrUpcomingSale(customFlashSale = {}, annualConfig = {}, currentTime = new Date()) {
  const now = currentTime instanceof Date ? currentTime : new Date(currentTime)
  
  // 1. Check if an ad-hoc custom flash sale is actively live
  if (customFlashSale && customFlashSale.enabled) {
    const start = customFlashSale.startDateTime ? new Date(customFlashSale.startDateTime) : null
    const end = customFlashSale.endDateTime ? new Date(customFlashSale.endDateTime) : null
    const nowMs = now.getTime()
    const isStarted = !start || nowMs >= start.getTime()
    const isEnded = end && nowMs > end.getTime()

    if (isStarted && !isEnded) {
      return {
        active: true,
        isLive: true,
        isTeaser: false,
        isAnnual: false,
        sale: {
          ...customFlashSale,
          isLive: true,
          isTeaser: false,
          isAnnual: false,
          startDateTimeIso: start ? start.toISOString() : null,
          endDateTimeIso: end ? end.toISOString() : null,
        },
        annualSchedule: evaluateAnnualSales(annualConfig, now).scheduleList,
      }
    }
  }

  // 2. Evaluate the 4 annual recurring sales
  const { activeAnnualSale, scheduleList } = evaluateAnnualSales(annualConfig, now)

  if (activeAnnualSale) {
    return {
      active: true,
      isLive: activeAnnualSale.isLive,
      isTeaser: activeAnnualSale.isTeaser,
      isAnnual: true,
      sale: {
        ...activeAnnualSale,
        startDateTime: activeAnnualSale.startDateIso,
        endDateTime: activeAnnualSale.endDateIso,
        startDateTimeIso: activeAnnualSale.startDateIso,
        endDateTimeIso: activeAnnualSale.endDateIso,
      },
      annualSchedule: scheduleList,
    }
  }

  return {
    active: false,
    isLive: false,
    isTeaser: false,
    isAnnual: false,
    sale: null,
    annualSchedule: scheduleList,
  }
}

/**
 * Legacy check: Checks if a flash sale is currently active
 * @param {Object} sale
 * @returns {boolean}
 */
export function isFlashSaleActive(sale) {
  if (!sale || !sale.active) return false
  const now = Date.now()
  if (sale.startDate && new Date(sale.startDate).getTime() > now) return false
  if (sale.endDate && new Date(sale.endDate).getTime() < now) return false
  return true
}

/**
 * Formats countdown time remaining string
 * @param {string|Date} targetDate
 * @param {number} currentTime
 * @returns {string} e.g. "02:45:10" or "4d 12h 30m"
 */
export function formatTimeRemaining(targetDate, currentTime = Date.now()) {
  if (!targetDate) return '00:00:00'
  const diff = new Date(targetDate).getTime() - currentTime
  if (diff <= 0) return '00:00:00'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const secs = Math.floor((diff % (1000 * 60)) / 1000)

  const pad = (n) => (n < 10 ? `0${n}` : String(n))
  if (days > 0) {
    return `${days}d ${pad(hours)}h ${pad(mins)}m`
  }
  return `${pad(hours)}:${pad(mins)}:${pad(secs)}`
}
