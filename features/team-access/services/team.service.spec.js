/**
 * @file team.service.spec.js
 * @description Unit test suite for Team models, roles, and validation.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  TeamRoles,
  RoleBadges,
  validateNewAdminInput,
} from '../models/team.model.js'

describe('Team Feature Model Suite', () => {
  test('TeamRoles defines complete hierarchy', () => {
    assert.strictEqual(TeamRoles.SUPER_ADMIN, 'super_admin')
    assert.strictEqual(TeamRoles.ADMIN, 'admin')
    assert.strictEqual(TeamRoles.STAFF, 'staff')
    assert.strictEqual(TeamRoles.CUSTOMER, 'customer')
  })

  test('validateNewAdminInput enforces valid name, email, and password length', () => {
    const invalidEmail = validateNewAdminInput({ name: 'Staff User', email: 'invalid', password: 'password123' })
    assert.strictEqual(invalidEmail.valid, false)

    const shortPassword = validateNewAdminInput({ name: 'Staff User', email: 'staff@siddhi.com', password: '123' })
    assert.strictEqual(shortPassword.valid, false)

    const valid = validateNewAdminInput({ name: 'Staff User', email: 'staff@siddhi.com', password: 'password123' })
    assert.strictEqual(valid.valid, true)
  })

  test('RoleBadges has styling for each role', () => {
    assert.ok(RoleBadges.super_admin.includes('purple'))
    assert.ok(RoleBadges.admin.includes('emerald'))
  })
})
