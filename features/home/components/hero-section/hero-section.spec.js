import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HeroSectionDefaults } from './hero-section.model.js';

describe('HeroSection Component Suite', () => {
  it('HeroSectionDefaults provides primary cta and tagline', () => {
    assert.equal(HeroSectionDefaults.PRIMARY_CTA, 'Plan your visit');
    assert.equal(HeroSectionDefaults.TAGLINE, 'Farm stays · Agro tourism · Celebrations');
  });
});
