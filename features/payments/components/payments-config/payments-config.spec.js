/**
 * @file payments-config.spec.js
 * @description Unit test suite for PaymentsConfig component defaults.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { PaymentsConfigDefaults } from './payments-config.model.js'

describe('PaymentsConfig Component Suite', () => {
  test('PaymentsConfigDefaults provides expected title and descriptions', () => {
    assert.strictEqual(typeof PaymentsConfigDefaults.TITLE, 'string')
    assert.strictEqual(typeof PaymentsConfigDefaults.SUBTITLE, 'string')
    assert.ok(PaymentsConfigDefaults.DESCRIPTION.includes('Razorpay'))
  })
})
