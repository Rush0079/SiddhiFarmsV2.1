/**
 * @file features/home/components/story-section/story-section.model.js
 * @description Features list and narrative copy for StorySection.
 */

import { HomeStoryFeatures } from '../../models/home.model.js';

export const StorySectionDefaults = {
  BADGE: 'The Siddhi feeling',
  TITLE_LINE1: 'A little closer',
  TITLE_LINE2: 'to what matters.',
  NARRATIVE: 'At Siddhi Farm Resort, the days are shaped by nature. Wander through our farm, dip into the pool, share a long meal, or simply find a shady spot and do absolutely nothing.'
};

export function getStoryFeatures() {
  return HomeStoryFeatures;
}
