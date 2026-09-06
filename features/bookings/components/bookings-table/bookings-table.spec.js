/**
 * @file bookings-table.spec.js
 * @description Unit test suite for BookingsTable filtering and styles.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { BookingsFilterStatus, StatusBadgeStyles, filterBookings } from './bookings-table.model.js'

describe('BookingsTable Component Suite', () => {
  const sampleBookings = [
    { id: 'SF-101', name: 'Rajesh Patil', phone: '9876543210', service: 'Master Bedroom', status: 'confirmed' },
    { id: 'SF-102', name: 'Neha Sharma', phone: '9123456789', service: '2 BHK Villa', status: 'pending' },
    { id: 'SF-103', name: 'Vikram Joshi', phone: '9988776655', service: '4 BHK Villa', status: 'cancelled' },
  ]

  test('filterBookings filters by query across name, phone, id, service', () => {
    const byName = filterBookings(sampleBookings, 'Rajesh')
    assert.strictEqual(byName.length, 1)
    assert.strictEqual(byName[0].id, 'SF-101')

    const byPhone = filterBookings(sampleBookings, '91234')
    assert.strictEqual(byPhone.length, 1)
    assert.strictEqual(byPhone[0].name, 'Neha Sharma')

    const byService = filterBookings(sampleBookings, 'Villa')
    assert.strictEqual(byService.length, 2)
  })

  test('filterBookings filters by status', () => {
    const pendingOnly = filterBookings(sampleBookings, '', 'pending')
    assert.strictEqual(pendingOnly.length, 1)
    assert.strictEqual(pendingOnly[0].status, 'pending')

    const all = filterBookings(sampleBookings, '', 'all')
    assert.strictEqual(all.length, 3)
  })

  test('StatusBadgeStyles maps known statuses', () => {
    assert.ok(StatusBadgeStyles.confirmed.includes('emerald'))
    assert.ok(StatusBadgeStyles.pending.includes('amber'))
    assert.ok(StatusBadgeStyles.cancelled.includes('rose'))
  })
})
