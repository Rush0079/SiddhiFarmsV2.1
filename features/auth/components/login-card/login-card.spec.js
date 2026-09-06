/**
 * @file login-card.spec.js
 * @description Unit test suite for LoginCard input validation and defaults.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { LoginCardDefaults, validateLoginInput } from './login-card.model.js'

describe('LoginCard Component Suite', () => {
  test('LoginCardDefaults provides standard UI strings', () => {
    assert.strictEqual(typeof LoginCardDefaults.TITLE, 'string')
    assert.strictEqual(typeof LoginCardDefaults.SUBMIT_BUTTON_TEXT, 'string')
    assert.strictEqual(typeof LoginCardDefaults.TIMEOUT_MESSAGE, 'string')
  })

  test('validateLoginInput rejects empty email or password', () => {
    const emptyEmail = validateLoginInput({ email: '', password: 'secretpassword' })
    assert.strictEqual(emptyEmail.valid, false)
    assert.strictEqual(emptyEmail.error, 'Email address is required')

    const emptyPassword = validateLoginInput({ email: 'admin@siddhi.com', password: '' })
    assert.strictEqual(emptyPassword.valid, false)
    assert.strictEqual(emptyPassword.error, 'Password is required')
  })

  test('validateLoginInput approves complete credentials', () => {
    const valid = validateLoginInput({ email: 'admin@siddhi.com', password: 'secretpassword' })
    assert.strictEqual(valid.valid, true)
  })
})
