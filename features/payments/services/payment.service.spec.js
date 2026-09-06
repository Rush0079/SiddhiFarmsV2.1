/**
 * @file payment.service.spec.js
 * @description Unit test suite for Payment models and UPI deep-link generation.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  PaymentMethod,
  PaymentClaimStatus,
  buildUpiDeepLink,
} from '../models/payment.model.js'

describe('Payment Feature Model Suite', () => {
  test('PaymentMethod contains razorpay and upi', () => {
    assert.strictEqual(PaymentMethod.RAZORPAY, 'razorpay')
    assert.strictEqual(PaymentMethod.UPI, 'upi')
  })

  test('PaymentClaimStatus defines progress states', () => {
    assert.strictEqual(PaymentClaimStatus.IDLE, 'idle')
    assert.strictEqual(PaymentClaimStatus.DONE, 'done')
  })

  test('buildUpiDeepLink generates correct upi:// scheme', () => {
    const link = buildUpiDeepLink({
      upiId: 'siddhi@icici',
      upiName: 'Siddhi Farm Resort',
      amount: 4500,
      bookingId: 'SF-999',
    })
    assert.ok(link.startsWith('upi://pay?'))
    assert.ok(link.includes('pa=siddhi%40icici'))
    assert.ok(link.includes('am=4500'))
    assert.ok(link.includes('cu=INR'))
  })

  test('buildUpiDeepLink returns null when upiId is missing', () => {
    assert.strictEqual(buildUpiDeepLink({ upiId: '' }), null)
  })
})
