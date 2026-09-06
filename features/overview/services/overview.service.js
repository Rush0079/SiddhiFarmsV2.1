/**
 * @file features/overview/services/overview.service.js
 * @description Service for fetching admin summary data.
 */

export class OverviewService {
  static async fetchSummary() {
    try {
      const res = await fetch('/api/admin/summary');
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }
}
