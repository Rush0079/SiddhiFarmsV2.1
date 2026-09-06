import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateBookingTerms, normalizeTerms, ContentDefaults } from '../models/content.model.js';

describe('Content CMS Model Suite', () => {
  it('normalizeTerms falls back to default version and conditions when null', () => {
    const terms = normalizeTerms(null);
    assert.equal(terms.version, ContentDefaults.DEFAULT_TERMS_VERSION);
    assert.ok(terms.terms.length >= 3);
  });

  it('validateBookingTerms validates version and terms array properly', () => {
    const invalidEmpty = validateBookingTerms({});
    assert.equal(invalidEmpty.valid, false);

    const validPayload = validateBookingTerms({
      version: '2026-v2',
      terms: ['No pets allowed', 'Quiet hours 10pm']
    });
    assert.equal(validPayload.valid, true);
    assert.equal(validPayload.errors.length, 0);
  });
});
