/**
 * @file features/overview/components/admin-stats-cards/admin-stats-cards.model.js
 * @description Card definitions and formatting for KPI summary metrics.
 */

export function formatStatCards(summary = {}) {
  return [
    { title: 'Bookings', value: summary.bookings || 0 },
    { title: 'Pending', value: summary.pending || 0 },
    { title: 'Confirmed', value: summary.confirmed || 0 },
    { title: 'Revenue', value: `₹${(summary.revenue || 0).toLocaleString('en-IN')}` },
    { title: 'Active coupons', value: summary.activeCoupons || 0 },
  ];
}
