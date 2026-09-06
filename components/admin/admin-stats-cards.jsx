/**
 * ============================================================================
 * ADMIN STATS CARDS COMPONENT — Real-Time Business KPIs
 * ============================================================================
 *
 * @fileoverview  Displays key business metrics across bookings, pending approvals,
 *                confirmed revenue, and active coupon counts in responsive cards.
 *
 * @module        components/admin/admin-stats-cards
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'

/**
 * AdminStatsCards Component
 *
 * @component
 * @param {Object} props
 * @param {Object} props.summary - Live summary counts from `/api/admin/summary`.
 * @returns {JSX.Element}
 */
export default function AdminStatsCards({ summary = {} }) {
  console.log('[UI:AdminStatsCards:RENDER] Rendering KPI summary cards')

  const statItems = [
    ['Bookings', summary.bookings || 0],
    ['Pending', summary.pending || 0],
    ['Confirmed', summary.confirmed || 0],
    ['Revenue', `₹${(summary.revenue || 0).toLocaleString('en-IN')}`],
    ['Active coupons', summary.activeCoupons || 0],
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {statItems.map(([title, value]) => (
        <div
          className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-white p-5 cursor-default transition-all duration-300 hover:shadow-md hover:border-[#315d4c]/30"
          key={title}
        >
          <p className="text-xs font-medium text-slate-500">{title}</p>
          <p className="mt-3 font-serif text-2xl font-bold text-[#315d4c]">{value}</p>
        </div>
      ))}
    </div>
  )
}
