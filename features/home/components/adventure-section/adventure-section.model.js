/**
 * @file features/home/components/adventure-section/adventure-section.model.js
 * @description Adventure activities teaser constants.
 */

import { HomeAdventureActivities } from '../../models/home.model.js';

export const AdventureSectionDefaults = {
  BADGE: 'Coming soon',
  TITLE_LINE1: 'A little more',
  TITLE_LINE2: 'adventure.',
  DESCRIPTION: 'Zip lines, rope courses and wild little memories are on their way to Siddhi.'
};

export function getAdventureActivities() {
  return HomeAdventureActivities;
}
