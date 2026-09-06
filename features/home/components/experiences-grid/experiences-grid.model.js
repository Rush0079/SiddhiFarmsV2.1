/**
 * @file features/home/components/experiences-grid/experiences-grid.model.js
 * @description Experience offerings list and grid defaults.
 */

import { EXPERIENCES } from '../../../../lib/helpers/formatting.js';

export const ExperiencesGridDefaults = {
  SUBTITLE: 'Choose your pace',
  TITLE_LINE1: 'There is always',
  TITLE_LINE2: 'more to experience.'
};

export function getExperiences() {
  return EXPERIENCES;
}
