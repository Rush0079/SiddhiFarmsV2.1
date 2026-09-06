import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ContentManagerDefaults } from './content-manager.model.js';

describe('ContentManager Component Suite', () => {
  it('ContentManagerDefaults provides expected image and terms section headers', () => {
    assert.equal(ContentManagerDefaults.SUBTITLE, 'Image manager');
    assert.equal(ContentManagerDefaults.TERMS_SUBTITLE, 'Booking terms');
  });
});
