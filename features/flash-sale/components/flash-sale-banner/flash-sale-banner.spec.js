/**
 * @file flash-sale-banner.spec.js
 * @description Unit test suite for FlashSaleBanner defaults and badge constants.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { FlashSaleBannerDefaults } from './flash-sale-banner.model.js'

describe('FlashSaleBanner Component Suite', () => {
  test('FlashSaleBannerDefaults has badge and claim button text', () => {
    assert.strictEqual(typeof FlashSaleBannerDefaults.BADGE, 'string')
    assert.strictEqual(typeof FlashSaleBannerDefaults.CLAIM_BUTTON_TEXT, 'string')
    assert.ok(FlashSaleBannerDefaults.BADGE.includes('FLASH SALE'))
  })
})
