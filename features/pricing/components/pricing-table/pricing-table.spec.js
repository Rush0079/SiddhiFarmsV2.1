/**
 * @file pricing-table.spec.js
 * @description Unit test suite for PricingTable default strings and keys.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { PricingTableDefaults } from './pricing-table.model.js'

describe('PricingTable Component Suite', () => {
  test('PricingTableDefaults provides standard UI strings', () => {
    assert.strictEqual(typeof PricingTableDefaults.TITLE, 'string')
    assert.strictEqual(typeof PricingTableDefaults.SAVE_BUTTON_TEXT, 'string')
    assert.strictEqual(typeof PricingTableDefaults.SAVED_NOTIFICATION, 'string')
  })
})
