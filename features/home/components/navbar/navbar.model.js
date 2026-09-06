/**
 * @file features/home/components/navbar/navbar.model.js
 * @description Navigation link configs and staff role checks.
 */

import { NAV_LINKS } from '../../../../lib/helpers/formatting.js';

export const STAFF_ROLES = ['staff', 'manager', 'super_admin'];

export function isStaffRole(role) {
  return STAFF_ROLES.includes(role);
}

export function getNavLinks() {
  return NAV_LINKS;
}
