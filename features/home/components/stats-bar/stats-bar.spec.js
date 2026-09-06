import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PROPERTY_STATS } from '../../../../lib/helpers/formatting.js';

describe('StatsBar Component Suite', () => {
  it('PROPERTY_STATS defines bedrooms, villas, farm, and ways', () => {
    assert.equal(PROPERTY_STATS.length, 4);
    assert.equal(PROPERTY_STATS[0][0], '03');
    assert.equal(PROPERTY_STATS[0][1], 'Master bedrooms');
  });
});
