/**
 * @file siddhi-logo.spec.js
 * @description Unit test suite for SiddhiLogo models and variants.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { SiddhiLogoVariants, SiddhiLogoBrand, isValidLogoVariant } from './siddhi-logo.model.js'

describe('SiddhiLogo Model Suite', () => {
  test('SiddhiLogoVariants includes icon, full, and nav', () => {
    assert.strictEqual(SiddhiLogoVariants.ICON, 'icon')
    assert.strictEqual(SiddhiLogoVariants.FULL, 'full')
    assert.strictEqual(SiddhiLogoVariants.NAV, 'nav')
  })

  test('isValidLogoVariant validates supported variants correctly', () => {
    assert.strictEqual(isValidLogoVariant('icon'), true)
    assert.strictEqual(isValidLogoVariant('full'), true)
    assert.strictEqual(isValidLogoVariant('nav'), true)
    assert.strictEqual(isValidLogoVariant('unsupported'), false)
  })

  test('SiddhiLogoBrand has expected name and tagline', () => {
    assert.strictEqual(SiddhiLogoBrand.NAME, 'SIDDHI FARMS')
    assert.ok(SiddhiLogoBrand.TAGLINE.includes('PUNE'))
  })
})
