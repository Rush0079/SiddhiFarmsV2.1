/**
 * @file booking.service.spec.js
 * @description Unit test suite for Booking models, validation, and calculations.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  BookingStatus,
  StayType,
  BookingDefaults,
  validateBookingRequest,
  calculateStayNights,
} from '../models/booking.model.js'

describe('Booking Model & Validation Suite', () => {
  test('BookingStatus contains required states', () => {
    assert.strictEqual(BookingStatus.PENDING, 'pending')
    assert.strictEqual(BookingStatus.CONFIRMED, 'confirmed')
    assert.strictEqual(BookingStatus.CANCELLED, 'cancelled')
  })

  test('validateBookingRequest enforces required fields and valid phone', () => {
    const invalidPhone = validateBookingRequest({
      customerName: 'Aarav Shah',
      phone: '123',
      checkIn: '2026-10-01',
      checkOut: '2026-10-03',
      guests: 2,
    })
    assert.strictEqual(invalidPhone.valid, false)
    assert.ok(invalidPhone.error.includes('10-digit'))

    const valid = validateBookingRequest({
      customerName: 'Aarav Shah',
      phone: '9876543210',
      checkIn: '2026-10-01',
      checkOut: '2026-10-03',
      guests: 2,
    })
    assert.strictEqual(valid.valid, true)
  })

  test('calculateStayNights returns correct night counts', () => {
    assert.strictEqual(calculateStayNights('2026-10-01', '2026-10-04'), 3)
    assert.strictEqual(calculateStayNights('2026-10-01', '2026-10-01'), 1)
  })
})
