import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExperiencesGridDefaults, getExperiences } from './experiences-grid.model.js';

describe('ExperiencesGrid Component Suite', () => {
  it('ExperiencesGridDefaults provides subtitle and section title', () => {
    assert.equal(ExperiencesGridDefaults.SUBTITLE, 'Choose your pace');
    assert.equal(ExperiencesGridDefaults.TITLE_LINE1, 'There is always');
  });

  it('getExperiences contains all 6 offerings', () => {
    const list = getExperiences();
    assert.equal(list.length, 6);
  });
});
