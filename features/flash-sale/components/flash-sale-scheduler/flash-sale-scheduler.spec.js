/**
 * @file flash-sale-scheduler.spec.js
 * @description Unit test suite for FlashSaleScheduler service options and defaults.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  FlashSaleServiceOptions,
  FlashSaleSchedulerDefaults,
} from './flash-sale-scheduler.model.js'

describe('FlashSaleScheduler Component Suite', () => {
  test('FlashSaleServiceOptions contains all major services', () => {
    assert.ok(Array.isArray(FlashSaleServiceOptions))
    assert.ok(FlashSaleServiceOptions.length >= 6)
    assert.strictEqual(FlashSaleServiceOptions[0][0], 'all')
  })

  test('FlashSaleSchedulerDefaults provides standard strings', () => {
    assert.strictEqual(typeof FlashSaleSchedulerDefaults.TITLE, 'string')
    assert.strictEqual(typeof FlashSaleSchedulerDefaults.SAVE_BUTTON_TEXT, 'string')
  })
})
