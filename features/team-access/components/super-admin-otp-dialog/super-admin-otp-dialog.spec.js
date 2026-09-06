/**
 * @file super-admin-otp-dialog.spec.js
 * @description Unit test suite for SuperAdminOtpDialog defaults.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SuperAdminOtpDefaults } from './super-admin-otp-dialog.model.js'

describe('SuperAdminOtpDialog Component Suite', () => {
  test('SuperAdminOtpDefaults provides expected title and confirm button text', () => {
    assert.strictEqual(typeof SuperAdminOtpDefaults.TITLE, 'string')
    assert.strictEqual(typeof SuperAdminOtpDefaults.CONFIRM_BUTTON_TEXT, 'string')
  })
})
