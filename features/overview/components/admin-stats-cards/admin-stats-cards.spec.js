import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatStatCards } from './admin-stats-cards.model.js';

describe('AdminStatsCards Component Suite', () => {
  it('formatStatCards maps summary KPIs correctly', () => {
    const cards = formatStatCards({ bookings: 12, revenue: 50000 });
    assert.equal(cards.length, 5);
    assert.equal(cards[0].title, 'Bookings');
    assert.equal(cards[0].value, 12);
    assert.ok(String(cards[3].value).includes('50,000'));
  });
});
