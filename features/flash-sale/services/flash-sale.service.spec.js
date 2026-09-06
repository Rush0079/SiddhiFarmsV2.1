/**
 * @file flash-sale.service.spec.js
 * @description Unit test suite for FlashSale models, annual sales, and time calculations.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  FlashSaleDiscountType,
  isFlashSaleActive,
  formatTimeRemaining,
  ANNUAL_SALES_DEFINITIONS,
  getAnnualSaleDates,
  evaluateAnnualSales,
  resolveActiveOrUpcomingSale,
} from '../models/flash-sale.model.js'

describe('FlashSale Feature Suite', () => {
  test('FlashSaleDiscountType defines percentage and fixed', () => {
    assert.strictEqual(FlashSaleDiscountType.PERCENTAGE, 'percentage')
    assert.strictEqual(FlashSaleDiscountType.FIXED, 'fixed')
  })

  test('isFlashSaleActive checks dates against current timestamp', () => {
    const now = Date.now()
    const activeSale = {
      active: true,
      startDate: new Date(now - 10000).toISOString(),
      endDate: new Date(now + 100000).toISOString(),
    }
    assert.strictEqual(isFlashSaleActive(activeSale), true)

    const inactiveSale = { ...activeSale, active: false }
    assert.strictEqual(isFlashSaleActive(inactiveSale), false)

    const expiredSale = {
      active: true,
      startDate: new Date(now - 200000).toISOString(),
      endDate: new Date(now - 100000).toISOString(),
    }
    assert.strictEqual(isFlashSaleActive(expiredSale), false)
  })

  test('formatTimeRemaining outputs formatted time string', () => {
    const now = 10000000
    const target = now + (2 * 3600 + 15 * 60 + 30) * 1000
    assert.strictEqual(formatTimeRemaining(target, now), '02:15:30')
    assert.strictEqual(formatTimeRemaining(now - 1000, now), '00:00:00')
  })

  test('ANNUAL_SALES_DEFINITIONS configures 4 annual sales with 10% discount, 10-day duration, and 15-day teaser', () => {
    assert.strictEqual(ANNUAL_SALES_DEFINITIONS.length, 4)
    const ids = ANNUAL_SALES_DEFINITIONS.map(s => s.id)
    assert.deepStrictEqual(ids, ['republic_day', 'independence_day', 'christmas', 'new_year'])

    for (const sale of ANNUAL_SALES_DEFINITIONS) {
      assert.strictEqual(sale.defaultDiscountValue, 10)
      assert.strictEqual(sale.defaultDiscountType, 'percentage')
      assert.strictEqual(sale.durationDays, 10)
      assert.strictEqual(sale.teaserDaysPrior, 15)
    }

    const rep = ANNUAL_SALES_DEFINITIONS.find(s => s.id === 'republic_day')
    assert.strictEqual(rep.startMonth, 1)
    assert.strictEqual(rep.startDay, 25)

    const ind = ANNUAL_SALES_DEFINITIONS.find(s => s.id === 'independence_day')
    assert.strictEqual(ind.startMonth, 8)
    assert.strictEqual(ind.startDay, 14)

    const xmas = ANNUAL_SALES_DEFINITIONS.find(s => s.id === 'christmas')
    assert.strictEqual(xmas.startMonth, 12)
    assert.strictEqual(xmas.startDay, 24)

    const ny = ANNUAL_SALES_DEFINITIONS.find(s => s.id === 'new_year')
    assert.strictEqual(ny.startMonth, 12)
    assert.strictEqual(ny.startDay, 30)
  })

  test('resolveActiveOrUpcomingSale detects LIVE annual sale during active 10 days', () => {
    // 16th August 2026 is during the Independence Day sale (starts 14th Aug for 10 days)
    const testDate = new Date('2026-08-16T12:00:00+05:30')
    const result = resolveActiveOrUpcomingSale({}, {}, testDate)

    assert.strictEqual(result.active, true)
    assert.strictEqual(result.isLive, true)
    assert.strictEqual(result.isTeaser, false)
    assert.strictEqual(result.sale.id, 'independence_day')
    assert.strictEqual(result.sale.discountValue, 10)
  })

  test('resolveActiveOrUpcomingSale detects TEASER annual sale 15 days prior to start date', () => {
    // 5th August 2026 is within 15 days prior to 14th August (Independence Day sale teaser starts ~30th July)
    const testDate = new Date('2026-08-05T12:00:00+05:30')
    const result = resolveActiveOrUpcomingSale({}, {}, testDate)

    assert.strictEqual(result.active, true)
    assert.strictEqual(result.isLive, false)
    assert.strictEqual(result.isTeaser, true)
    assert.strictEqual(result.sale.id, 'independence_day')
  })

  test('admin discount override updates discount value in resolved sale', () => {
    const testDate = new Date('2026-08-16T12:00:00+05:30')
    const adminConfig = {
      independence_day: {
        discountValue: 15, // Custom 15% override
        bannerMessage: 'Admin custom headline 15% OFF'
      }
    }
    const result = resolveActiveOrUpcomingSale({}, adminConfig, testDate)

    assert.strictEqual(result.sale.discountValue, 15)
    assert.strictEqual(result.sale.bannerMessage, 'Admin custom headline 15% OFF')
  })
})
