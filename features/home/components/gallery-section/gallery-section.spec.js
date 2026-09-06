import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GallerySectionDefaults, getGalleryItems } from './gallery-section.model.js';

describe('GallerySection Component Suite', () => {
  it('GallerySectionDefaults provides PDF url and CTA', () => {
    assert.equal(GallerySectionDefaults.CTA_TEXT, 'View full photo story');
    assert.ok(GallerySectionDefaults.PDF_URL.startsWith('http'));
  });

  it('getGalleryItems contains 6 gallery frames', () => {
    const list = getGalleryItems();
    assert.equal(list.length, 6);
  });
});
