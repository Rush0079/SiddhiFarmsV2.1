import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BookingTermsDefaults } from './booking-terms.model.js';

describe('BookingTerms Component Suite', () => {
  it('BookingTermsDefaults provides expected modal title and confirm action text', () => {
    assert.equal(BookingTermsDefaults.MODAL_TITLE, 'Resort Terms & Conditions');
    assert.equal(BookingTermsDefaults.CONFIRM_BUTTON_TEXT, 'Accept & Continue');
  });
});
