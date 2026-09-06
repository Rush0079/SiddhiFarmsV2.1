/**
 * @file auth.service.spec.js
 * @description Unit tests for AuthService models and validation helpers.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  AuthStep,
  AuthRoles,
  AuthConfig,
  isValidEmail,
  isValidOtpCode,
  maskEmail,
} from '../models/auth.model.js'

describe('Auth Feature Model & Validation Suite', () => {
  test('AuthStep contains CREDENTIALS and OTP', () => {
    assert.strictEqual(AuthStep.CREDENTIALS, 'credentials')
    assert.strictEqual(AuthStep.OTP, 'otp')
  })

  test('AuthRoles contains admin, super_admin, and staff', () => {
    assert.strictEqual(AuthRoles.ADMIN, 'admin')
    assert.strictEqual(AuthRoles.SUPER_ADMIN, 'super_admin')
    assert.strictEqual(AuthRoles.STAFF, 'staff')
  })

  test('AuthConfig holds accurate security constants', () => {
    assert.strictEqual(AuthConfig.LOCKOUT_THRESHOLD, 3)
    assert.strictEqual(AuthConfig.OTP_LENGTH, 6)
    assert.strictEqual(AuthConfig.OTP_EXPIRY_SECONDS, 600)
  })

  test('isValidEmail handles valid and invalid emails', () => {
    assert.strictEqual(isValidEmail('admin@siddhifarms.com'), true)
    assert.strictEqual(isValidEmail('invalid-email'), false)
    assert.strictEqual(isValidEmail(''), false)
    assert.strictEqual(isValidEmail(null), false)
  })

  test('isValidOtpCode validates 6-digit numeric string', () => {
    assert.strictEqual(isValidOtpCode('123456'), true)
    assert.strictEqual(isValidOtpCode('12345'), false)
    assert.strictEqual(isValidOtpCode('abcdef'), false)
    assert.strictEqual(isValidOtpCode(''), false)
  })

  test('maskEmail obfuscates email addresses appropriately', () => {
    assert.strictEqual(maskEmail('john@example.com'), 'j***n@example.com')
    assert.strictEqual(maskEmail('a@b.com'), 'a***@b.com')
  })
})
