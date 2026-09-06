/**
 * @file two-factor-auth.spec.js
 * @description Unit test suite for TwoFactorAuth countdown and formatting.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { TwoFactorAuthDefaults, formatCountdown } from './two-factor-auth.model.js'

describe('TwoFactorAuth Component Model Suite', () => {
  test('TwoFactorAuthDefaults contains necessary text strings', () => {
    assert.strictEqual(typeof TwoFactorAuthDefaults.VERIFY_BUTTON_TEXT, 'string')
    assert.strictEqual(typeof TwoFactorAuthDefaults.RESEND_BUTTON_TEXT, 'string')
  })

  test('formatCountdown formats minutes and seconds with padding', () => {
    assert.strictEqual(formatCountdown(600), '10:00')
    assert.strictEqual(formatCountdown(59), '0:59')
    assert.strictEqual(formatCountdown(9), '0:09')
    assert.strictEqual(formatCountdown(0), '0:00')
    assert.strictEqual(formatCountdown(-10), '0:00')
  })
})
