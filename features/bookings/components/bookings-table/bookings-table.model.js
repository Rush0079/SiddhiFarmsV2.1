/**
 * @file bookings-table.model.js
 * @description Data model, filter options, and status color maps for BookingsTable.
 */

export const BookingsFilterStatus = {
  ALL: 'all',
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}

export const StatusBadgeStyles = {
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-300',
  completed: 'bg-blue-100 text-blue-800 border-blue-300',
  rejected: 'bg-slate-100 text-slate-700 border-slate-300',
}

/**
 * Filters bookings by query and status
 * @param {Array} bookings
 * @param {string} query
 * @param {string} statusFilter
 * @returns {Array}
 */
export function filterBookings(bookings = [], query = '', statusFilter = 'all') {
  if (!Array.isArray(bookings)) return []
  const q = (query || '').toLowerCase().trim()

  return bookings.filter(b => {
    const matchesQuery =
      !q ||
      (b.name && b.name.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q)) ||
      (b.service && b.service.toLowerCase().includes(q)) ||
      (b.id && String(b.id).toLowerCase().includes(q))

    const matchesStatus = statusFilter === 'all' || b.status === statusFilter

    return matchesQuery && matchesStatus
  })
}
