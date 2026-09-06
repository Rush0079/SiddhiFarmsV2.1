/**
 * @file features/content-cms/services/content.service.js
 * @description Service layer for site content and booking terms persistence.
 */

import { normalizeTerms, validateBookingTerms } from '../models/content.model.js';

export class ContentService {
  /**
   * Fetches latest booking terms
   */
  static async fetchTerms() {
    try {
      const res = await fetch('/api/booking-terms');
      if (!res.ok) return normalizeTerms(null);
      const data = await res.json();
      return normalizeTerms(data);
    } catch {
      return normalizeTerms(null);
    }
  }

  /**
   * Saves updated booking terms
   */
  static async saveTerms(termsData) {
    const validation = validateBookingTerms(termsData);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    const res = await fetch('/api/booking-terms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(termsData)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save booking terms');
    }

    return await res.json();
  }
}
