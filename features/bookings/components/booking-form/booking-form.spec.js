/**
 * @file booking-form.spec.js
 * @description Unit test suite for BookingForm presets and step models.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { BookingFormSteps, SHORT_STAY_PRESETS, BookingFormDefaults } from './booking-form.model.js'

describe('BookingForm Component Suite', () => {
  test('SHORT_STAY_PRESETS has valid hours and labels', () => {
    assert.ok(Array.isArray(SHORT_STAY_PRESETS))
    assert.ok(SHORT_STAY_PRESETS.length >= 3)
    SHORT_STAY_PRESETS.forEach(preset => {
      assert.strictEqual(typeof preset.hours, 'number')
      assert.strictEqual(typeof preset.label, 'string')
    })
  })

  test('BookingFormSteps contains complete sequence', () => {
    assert.strictEqual(BookingFormSteps.DETAILS, 1)
    assert.strictEqual(BookingFormSteps.PAYMENT, 3)
  })

  test('BookingFormDefaults contains title & subtitle', () => {
    assert.ok(BookingFormDefaults.TITLE.length > 0)
    assert.ok(BookingFormDefaults.SUBTITLE.length > 0)
  })
})
