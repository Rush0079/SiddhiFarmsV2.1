/**
 * @file coupon.model.js
 * @description Data models and validation schemas for promotional coupons and advance deposit codes.
 */

export const CouponDiscountType = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
}

export const AdvanceDepositType = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed',
}

/**
 * Validates advance code creation input
 * @param {Object} input
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAdvanceCodeInput(input = {}) {
  if (!input.code || !input.code.trim()) {
    return { valid: false, error: 'Advance code is required' }
  }
  const hasPercentage = Number(input.percentage) > 0
  const hasFixed = Number(input.fixedAmount) > 0
  if (!hasPercentage && !hasFixed) {
    return { valid: false, error: 'Either percentage or fixed amount deposit must be specified' }
  }
  return { valid: true }
}

/**
 * Calculates advance deposit amount and pending balance
 * @param {number} totalAmount
 * @param {{ percentage?: number, fixedAmount?: number }} code
 * @returns {{ deposit: number, pending: number }}
 */
export function calculateAdvanceSplit(totalAmount, code = {}) {
  const safeTotal = Math.max(0, Number(totalAmount) || 0)
  let deposit = 0

  if (code.percentage && Number(code.percentage) > 0) {
    deposit = Math.round(safeTotal * Math.min(100, Number(code.percentage)) / 100)
  } else if (code.fixedAmount && Number(code.fixedAmount) > 0) {
    deposit = Math.min(safeTotal, Number(code.fixedAmount))
  }

  const pending = Math.max(0, safeTotal - deposit)
  return { deposit, pending }
}
