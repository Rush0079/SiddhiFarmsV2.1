/**
 * @file luxury-loader.spec.js
 * @description Unit tests for LuxuryLoader models and exports.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { LuxuryLoaderDefaults, validateLoaderProps } from './luxury-loader.model.js'

describe('LuxuryLoader Model & Props Suite', () => {
  test('LuxuryLoaderDefaults has all required configuration keys', () => {
    assert.strictEqual(typeof LuxuryLoaderDefaults.PAGE_TITLE, 'string')
    assert.strictEqual(typeof LuxuryLoaderDefaults.PAGE_SUBTITLE, 'string')
    assert.strictEqual(typeof LuxuryLoaderDefaults.OVERLAY_TITLE, 'string')
    assert.strictEqual(typeof LuxuryLoaderDefaults.OVERLAY_SUBTITLE, 'string')
    assert.strictEqual(typeof LuxuryLoaderDefaults.PROGRESS_MESSAGE, 'string')
  })

  test('validateLoaderProps accepts valid props object', () => {
    const validProps = { show: true, title: 'Loading test' }
    assert.strictEqual(validateLoaderProps(validProps), true)
  })

  test('validateLoaderProps handles null/undefined safely', () => {
    assert.strictEqual(validateLoaderProps(null), false)
    assert.strictEqual(validateLoaderProps(undefined), true) // default {}
  })
})
