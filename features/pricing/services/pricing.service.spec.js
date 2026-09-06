/**
 * @file pricing.service.spec.js
 * @description Unit test suite for Pricing models and custom rate validation.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  ServiceRateKeys,
  ServiceLabels,
  validateCustomRate,
} from '../models/pricing.model.js'

describe('Pricing Feature Model Suite', () => {
  test('ServiceRateKeys defines all main resort services', () => {
    assert.strictEqual(ServiceRateKeys.MASTER_BEDROOM, 'masterBedroom')
    assert.strictEqual(ServiceRateKeys.VILLA_2BHK, 'villa2BHK')
    assert.strictEqual(ServiceRateKeys.VILLA_4BHK, 'villa4BHK')
    assert.strictEqual(ServiceRateKeys.ONE_DAY_TOUR, 'oneDayTour')
  })

  test('ServiceLabels provides human readable descriptions', () => {
    assert.ok(ServiceLabels.masterBedroom.includes('Overnight'))
    assert.ok(ServiceLabels.masterBedroomShortStay.includes('Short Stay'))
  })

  test('validateCustomRate validates key, label, and positive value', () => {
    const invalidKey = validateCustomRate({ key: '', label: 'Gazebo', value: 1500 })
    assert.strictEqual(invalidKey.valid, false)

    const invalidValue = validateCustomRate({ key: 'gazebo', label: 'Gazebo', value: -100 })
    assert.strictEqual(invalidValue.valid, false)

    const valid = validateCustomRate({ key: 'gazebo', label: 'Luxury Gazebo Rental', value: 2500 })
    assert.strictEqual(valid.valid, true)
  })
})
