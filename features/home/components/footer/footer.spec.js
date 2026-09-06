import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FooterDefaults } from './footer.model.js';

describe('Footer Component Suite', () => {
  it('FooterDefaults provides verified phone and instagram url', () => {
    assert.equal(FooterDefaults.PHONE, '7083682768');
    assert.ok(FooterDefaults.INSTAGRAM_URL.includes('instagram.com'));
    assert.equal(FooterDefaults.DEVELOPER_NAME, 'Rushikesh Nigade');
  });
});
