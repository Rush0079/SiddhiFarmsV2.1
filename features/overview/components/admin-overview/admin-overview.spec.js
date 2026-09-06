import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdminOverviewDefaults } from './admin-overview.model.js';

describe('AdminOverview Component Suite', () => {
  it('AdminOverviewDefaults provides expected velocity and activity stream titles', () => {
    assert.equal(AdminOverviewDefaults.VELOCITY_TITLE, 'Weekly Revenue Velocity');
    assert.equal(AdminOverviewDefaults.STREAM_TITLE, 'Recent Reservation Activity');
  });
});
