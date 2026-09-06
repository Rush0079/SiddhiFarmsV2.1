/**
 * @file time-editor-modal.spec.js
 * @description Unit test suite for TimeEditorModal time validator and defaults.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { TimeEditorDefaults, isValidTimeString } from './time-editor-modal.model.js'

describe('TimeEditorModal Component Suite', () => {
  test('isValidTimeString validates 24-hour time format', () => {
    assert.strictEqual(isValidTimeString('11:00'), true)
    assert.strictEqual(isValidTimeString('00:00'), true)
    assert.strictEqual(isValidTimeString('23:59'), true)
    assert.strictEqual(isValidTimeString('24:00'), false)
    assert.strictEqual(isValidTimeString('11:60'), false)
    assert.strictEqual(isValidTimeString('invalid'), false)
  })

  test('TimeEditorDefaults has check-in and check-out defaults', () => {
    assert.strictEqual(TimeEditorDefaults.DEFAULT_CHECKIN, '11:00')
    assert.strictEqual(TimeEditorDefaults.DEFAULT_CHECKOUT, '10:00')
  })
})
