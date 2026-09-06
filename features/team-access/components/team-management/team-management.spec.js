/**
 * @file team-management.spec.js
 * @description Unit test suite for TeamManagement defaults and copy.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { TeamManagementDefaults } from './team-management.model.js'

describe('TeamManagement Component Suite', () => {
  test('TeamManagementDefaults has title and button text', () => {
    assert.strictEqual(typeof TeamManagementDefaults.TITLE, 'string')
    assert.strictEqual(typeof TeamManagementDefaults.CREATE_BUTTON_TEXT, 'string')
  })
})
