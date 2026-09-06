/**
 * @file coupon.service.spec.js
 * @description Unit test suite for Coupon and Advance Code models and split calculations.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  CouponDiscountType,
  AdvanceDepositType,
  validateAdvanceCodeInput,
  calculateAdvanceSplit,
} from '../models/coupon.model.js'

describe('Coupon & Advance Code Suite', () => {
  test('Enums provide standard values', () => {
    assert.strictEqual(CouponDiscountType.PERCENTAGE, 'percentage')
    assert.strictEqual(CouponDiscountType.FIXED, 'fixed')
    assert.strictEqual(AdvanceDepositType.PERCENTAGE, 'percentage')
  })

  test('validateAdvanceCodeInput enforces code and at least one deposit type', () => {
    const empty = validateAdvanceCodeInput({})
    assert.strictEqual(empty.valid, false)

    const noAmount = validateAdvanceCodeInput({ code: 'DEPOSIT50', percentage: 0, fixedAmount: 0 })
    assert.strictEqual(noAmount.valid, false)

    const validPercent = validateAdvanceCodeInput({ code: 'DEPOSIT50', percentage: 50 })
    assert.strictEqual(validPercent.valid, true)

    const validFixed = validateAdvanceCodeInput({ code: 'DEPOSIT2000', fixedAmount: 2000 })
    assert.strictEqual(validFixed.valid, true)
  })

  test('calculateAdvanceSplit correctly computes percentage and fixed splits', () => {
    const percentSplit = calculateAdvanceSplit(10000, { percentage: 30 })
    assert.strictEqual(percentSplit.deposit, 3000)
    assert.strictEqual(percentSplit.pending, 7000)

    const fixedSplit = calculateAdvanceSplit(10000, { fixedAmount: 4000 })
    assert.strictEqual(fixedSplit.deposit, 4000)
    assert.strictEqual(fixedSplit.pending, 6000)
  })
})
