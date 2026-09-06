import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isStaffRole, getNavLinks, STAFF_ROLES } from './navbar.model.js';

describe('Navbar Component Suite', () => {
  it('STAFF_ROLES includes staff, manager, super_admin', () => {
    assert.ok(isStaffRole('manager'));
    assert.ok(isStaffRole('super_admin'));
    assert.equal(isStaffRole('guest'), false);
  });

  it('getNavLinks returns navigation items', () => {
    const links = getNavLinks();
    assert.ok(links.length > 0);
  });
});
