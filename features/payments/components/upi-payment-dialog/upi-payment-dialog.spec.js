/**
 * @file upi-payment-dialog.spec.js
 * @description Unit test suite for UpiPaymentDialog strings and defaults.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { UpiDialogDefaults } from './upi-payment-dialog.model.js'

describe('UpiPaymentDialog Component Suite', () => {
  test('UpiDialogDefaults has expected labels', () => {
    assert.strictEqual(typeof UpiDialogDefaults.TOGGLE_BUTTON, 'string')
    assert.strictEqual(typeof UpiDialogDefaults.CLAIM_BUTTON_TEXT, 'string')
    assert.ok(UpiDialogDefaults.SUCCESS_TITLE.includes('Payment noted'))
  })
})
