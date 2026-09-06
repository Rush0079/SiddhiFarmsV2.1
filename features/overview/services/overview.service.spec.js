import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeWeeklyVelocity, computeStatusDistribution, DayLabels } from '../models/overview.model.js';

describe('Overview Feature Model Suite', () => {
  it('computeWeeklyVelocity creates data points for each day of week', () => {
    const velocity = computeWeeklyVelocity([]);
    assert.equal(velocity.length, DayLabels.length);
    assert.equal(velocity[0].revenue, 0);
  });

  it('computeStatusDistribution segments bookings into confirmed, pending, and cancelled', () => {
    const mockBookings = [
      { id: 1, paid: true, status: 'confirmed' },
      { id: 2, paid: false, status: 'pending' },
      { id: 3, status: 'cancelled' }
    ];
    const distribution = computeStatusDistribution(mockBookings);
    assert.equal(distribution[0].value, 1);
    assert.equal(distribution[1].value, 1);
    assert.equal(distribution[2].value, 1);
  });
});
