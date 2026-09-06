import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HomeStoryFeatures, HomeAdventureActivities } from '../models/home.model.js';
import { HomeService } from './home.service.js';

describe('Home Feature Model & Service Suite', () => {
  it('HomeStoryFeatures contains core selling propositions', () => {
    assert.equal(HomeStoryFeatures.length, 4);
    assert.ok(HomeStoryFeatures.includes('Farm-fresh organic dining'));
  });

  it('HomeAdventureActivities provides activities and animation delays', () => {
    assert.equal(HomeAdventureActivities.length, 3);
  });

  it('HomeService.getLocationTagline formats address string', () => {
    const tagline = HomeService.getLocationTagline();
    assert.ok(tagline.includes('Pune'));
    assert.ok(tagline.includes('Maharashtra'));
  });
});
