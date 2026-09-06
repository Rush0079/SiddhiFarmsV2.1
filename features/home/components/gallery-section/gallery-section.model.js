/**
 * @file features/home/components/gallery-section/gallery-section.model.js
 * @description Gallery items and header configuration.
 */

import { GALLERY_ITEMS } from '../../../../lib/helpers/formatting.js';

export const GallerySectionDefaults = {
  SUBTITLE: 'A glimpse of Siddhi',
  TITLE_LINE1: 'The place is',
  TITLE_LINE2: 'the experience.',
  CTA_TEXT: 'View full photo story',
  PDF_URL: 'https://customer-assets-wrfwihn1.emergentagent.net/job_siddhi-farm-dev/artifacts/wgys6sb0_Siddhi%20Farm.pdf'
};

export function getGalleryItems() {
  return GALLERY_ITEMS;
}
