import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StorySectionDefaults, getStoryFeatures } from './story-section.model.js';

describe('StorySection Component Suite', () => {
  it('StorySectionDefaults provides badge and title line', () => {
    assert.equal(StorySectionDefaults.BADGE, 'The Siddhi feeling');
    assert.equal(StorySectionDefaults.TITLE_LINE1, 'A little closer');
  });

  it('getStoryFeatures returns core feature list', () => {
    const features = getStoryFeatures();
    assert.equal(features.length, 4);
  });
});
