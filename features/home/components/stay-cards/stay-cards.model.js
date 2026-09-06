/**
 * @file features/home/components/stay-cards/stay-cards.model.js
 * @description Stay accommodations list and copy.
 */

import { STAY_CARDS } from '../../../../lib/helpers/formatting.js';

export const StayCardsDefaults = {
  SUBTITLE: 'Stay awhile',
  TITLE_LINE1: 'Your room in',
  TITLE_LINE2: 'the countryside.',
  CTA_TEXT: 'View availability'
};

export function getStayCards() {
  return STAY_CARDS;
}
