/**
 * @file features/overview/models/overview.model.js
 * @description Domain models and metrics calculation for admin executive overview.
 */

export const DayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Computes 7-day revenue velocity from bookings
 * @param {Array} bookings 
 * @returns {Array<{ name: string, revenue: number, bookings: number }>}
 */
export function computeWeeklyVelocity(bookings = []) {
  const data = DayLabels.map((d) => ({ name: d, revenue: 0, bookings: 0 }));

  bookings.forEach((b) => {
    const date = new Date(b.created_at || b.checkIn || Date.now());
    const dayIdx = (date.getDay() + 6) % 7; // Monday = 0
    if (data[dayIdx]) {
      data[dayIdx].revenue += Number(b.total_amount || b.amount || 0);
      data[dayIdx].bookings += 1;
    }
  });

  return data;
}

/**
 * Computes booking status breakdown
 * @param {Array} bookings 
 * @param {Object} summary 
 * @returns {Array<{ name: string, value: number, color: string }>}
 */
export function computeStatusDistribution(bookings = [], summary = {}) {
  const confirmed = bookings.filter((b) => b.paid || b.status === 'confirmed').length;
  const pending = bookings.filter((b) => !b.paid && b.status !== 'cancelled').length;
  const cancelled = bookings.filter((b) => b.status === 'cancelled').length;

  return [
    { name: 'Confirmed', value: confirmed || summary.confirmed || 0, color: '#315d4c' },
    { name: 'Pending', value: pending || summary.pending || 0, color: '#d5b36a' },
    { name: 'Cancelled', value: cancelled, color: '#ef4444' }
  ];
}
