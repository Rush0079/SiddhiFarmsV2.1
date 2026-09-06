/**
 * @file advance-codes-panel.spec.js
 * @description Unit test suite for AdvanceCodesPanel strings and defaults.
 */

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { AdvanceCodesPanelDefaults } from './advance-codes-panel.model.js'

describe('AdvanceCodesPanel Component Suite', () => {
  test('AdvanceCodesPanelDefaults provides expected title and guidelines', () => {
    assert.strictEqual(typeof AdvanceCodesPanelDefaults.TITLE, 'string')
    assert.strictEqual(typeof AdvanceCodesPanelDefaults.CREATE_BUTTON_TEXT, 'string')
    assert.ok(AdvanceCodesPanelDefaults.WARNING_GUIDELINE.includes('Advance Deposit Tokens'))
  })
})
