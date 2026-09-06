import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AdventureSectionDefaults, getAdventureActivities } from './adventure-section.model.js';

describe('AdventureSection Component Suite', () => {
  it('AdventureSectionDefaults provides badge and title line', () => {
    assert.equal(AdventureSectionDefaults.BADGE, 'Coming soon');
    assert.equal(AdventureSectionDefaults.TITLE_LINE1, 'A little more');
  });

  it('getAdventureActivities returns list of 3 activities', () => {
    const list = getAdventureActivities();
    assert.equal(list.length, 3);
  });
});
