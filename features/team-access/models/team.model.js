/**
 * @file team.model.js
 * @description Data models and role definitions for Staff & Team Access.
 */

export const TeamRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  STAFF: 'staff',
  CUSTOMER: 'customer',
}

export const RoleBadges = {
  super_admin: 'bg-purple-100 text-purple-800 border-purple-200',
  admin: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  staff: 'bg-blue-100 text-blue-800 border-blue-200',
  customer: 'bg-slate-100 text-slate-700 border-slate-200',
}

/**
 * Validates new admin invitation payload
 * @param {Object} input
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateNewAdminInput(input = {}) {
  if (!input.name || !input.name.trim()) return { valid: false, error: 'Name is required' }
  if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { valid: false, error: 'Valid email is required' }
  }
  if (!input.password || input.password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  return { valid: true }
}
