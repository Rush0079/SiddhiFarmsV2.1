/**
 * @file session-timeout.spec.js
 * @description Unit test suite for SessionTimeout model and expiration logic.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SessionTimeoutConfig, isSessionExpired } from './session-timeout.model.js'

describe('SessionTimeout Model & Expiration Suite', () => {
  test('SessionTimeoutConfig has standard timeout and keys', () => {
    assert.strictEqual(SessionTimeoutConfig.INACTIVITY_TIMEOUT_MS, 60 * 1000)
    assert.strictEqual(SessionTimeoutConfig.STORAGE_KEY, 'siddhi_admin_last_active')
    assert.strictEqual(SessionTimeoutConfig.COOKIE_NAME, 'siddhi_2fa_session')
  })

  test('isSessionExpired accurately flags expired duration', () => {
    const now = 1000000
    const threshold = 60 * 1000

    // Just active 30 seconds ago -> NOT expired
    assert.strictEqual(isSessionExpired(now - 30000, now, threshold), false)

    // Active exactly threshold ago -> Expired
    assert.strictEqual(isSessionExpired(now - threshold, now, threshold), true)

    // Active 65 seconds ago -> Expired
    assert.strictEqual(isSessionExpired(now - threshold - 5000, now, threshold), true)
  })

  test('isSessionExpired returns false for missing or non-positive timestamp', () => {
    assert.strictEqual(isSessionExpired(0), false)
    assert.strictEqual(isSessionExpired(null), false)
  })
})
