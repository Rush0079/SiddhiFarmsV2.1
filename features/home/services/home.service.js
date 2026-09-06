/**
 * @file features/home/services/home.service.js
 * @description Service utilities for home view resolution and analytics.
 */

import { HomeLocationConfig } from '../models/home.model.js';

export class HomeService {
  /**
   * Resolves resort location tagline
   */
  static getLocationTagline() {
    return `${HomeLocationConfig.CITY}, ${HomeLocationConfig.STATE}, ${HomeLocationConfig.COUNTRY}`;
  }
}
