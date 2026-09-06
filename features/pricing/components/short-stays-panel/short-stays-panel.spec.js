/**
 * @file short-stays-panel.spec.js
 * @description Unit test suite for ShortStaysPanel defaults and room configurations.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { ShortStayDefaults, ShortStayRooms } from './short-stays-panel.model.js'

describe('ShortStaysPanel Component Suite', () => {
  test('ShortStayRooms includes bedroom and villas', () => {
    assert.ok(Array.isArray(ShortStayRooms))
    assert.strictEqual(ShortStayRooms.length, 3)
    assert.strictEqual(ShortStayRooms[0].key, 'masterBedroomShortStay')
  })

  test('ShortStayDefaults has title and subtitle', () => {
    assert.strictEqual(typeof ShortStayDefaults.TITLE, 'string')
    assert.strictEqual(typeof ShortStayDefaults.SUBTITLE, 'string')
  })
})
