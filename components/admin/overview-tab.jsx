/**
 * ============================================================================
 * OVERVIEW TAB COMPONENT — Executive Dashboard & Visual Analytics
 * ============================================================================
 *
 * @fileoverview  Executive overview tab for the Siddhi Farms Operations Center.
 *                Features:
 *                1. 7-Day Revenue Velocity Area Chart (Recharts)
 *                2. Payment & Booking Health Donut Chart with active Sector hover
 *                3. Quick Action Cards (Flash Sales, Short Stays, 2FA Security)
 *                4. Live Activity Stream (Recent 5 reservations)
 *
 * @module        components/admin/overview-tab
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  PieChart as PieIcon,
  Zap,
  Clock3,
  ShieldCheck,
  ChevronRight,
  Activity,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts'

/**
 * OverviewTab Component
 *
 * @component
 * @param {Object}   props
 * @param {Array}    props.bookings        - Array of all booking records.
 * @param {Object}   props.summary         - Business summary metrics.
 * @param {boolean}  props.canManagePricing - Flag indicating manager/super_admin privileges.
 * @param {boolean}  props.canManageRoles   - Flag indicating super_admin privileges.
 * @param {Function} props.onSelectTab     - Callback to navigate between admin tabs.
 * @param {boolean}  props.mounted         - Hydration mounting flag.
 * @returns {JSX.Element}
 */
export default function OverviewTab({
  bookings = [],
  summary = {},
  canManagePricing = false,
  canManageRoles = false,
  onSelectTab,
  mounted = true,
}) {
  console.log('[UI:OverviewTab:RENDER] Rendering overview charts & live activity')

  const [activePieIndex, setActivePieIndex] = useState(null)

  // ─── 7-Day Weekly Revenue Velocity Computation ───────────────────────────
  const revenueChartData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const data = days.map((d) => ({ name: d, revenue: 0, bookings: 0 }))

    bookings.forEach((b) => {
      const date = new Date(b.created_at || b.checkIn || Date.now())
      const dayIdx = (date.getDay() + 6) % 7 // Monday = 0
      if (data[dayIdx]) {
        data[dayIdx].revenue += Number(b.total_amount || b.amount || 0)
        data[dayIdx].bookings += 1
      }
    })
    return data
  }, [bookings])

  // ─── Booking Status Ratio Computation ────────────────────────────────────
  const statusDistribution = useMemo(() => {
    const confirmed = bookings.filter((b) => b.paid || b.status === 'confirmed').length
    const pending = bookings.filter((b) => !b.paid && b.status !== 'cancelled').length
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length

    return [
      { name: 'Confirmed', value: confirmed || summary.confirmed || 0, color: '#315d4c' },
      { name: 'Pending', value: pending || summary.pending || 0, color: '#d5b36a' },
      { name: 'Cancelled', value: cancelled, color: '#ef4444' },
    ]
  }, [bookings, summary])

  // ─── Interactive Hover Sector for Donut Chart ────────────────────────────
  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 3}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{
            filter: 'drop-shadow(0px 6px 14px rgba(23, 61, 53, 0.35))',
            cursor: 'pointer',
            outline: 'none',
            transition: 'all 0.3s ease',
          }}
        />
      </g>
    )
  }

  return (
    <div className="mt-8 space-y-8">
      {/* ─── Visual Analytics & Charts ──────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Revenue & Booking Velocity Curve */}
        <div className="stat-card-motion rounded-3xl border border-[#dfe7dc] bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-700" />
                <p className="eyebrow text-emerald-800">Financial Velocity</p>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl text-[#173d35] mt-1 font-bold">
                Weekly Revenue Velocity
              </h3>
            </div>
            <div className="rounded-full bg-[#f3f5ef] px-3.5 py-1 text-xs font-bold text-emerald-900 border border-[#dfe7dc]">
              7-Day Trajectory
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#173d35" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#173d35" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f4ee" />
                  <XAxis dataKey="name" stroke="#8ca392" fontSize={11} tickLine={false} />
                  <YAxis stroke="#8ca392" fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-xl border border-[#dfe7dc] bg-[#173d35] p-3 text-white shadow-xl">
                            <p className="text-xs font-bold text-emerald-300">{label}</p>
                            <p className="text-sm font-semibold mt-1">
                              ₹{Number(payload[0]?.value || 0).toLocaleString('en-IN')}
                            </p>
                            <p className="text-[11px] text-emerald-200/70">
                              {payload[0]?.payload?.bookings || 1} booking(s)
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#173d35"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#emeraldGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Status Distribution Donut Chart */}
        <div className="stat-card-motion rounded-3xl border border-[#dfe7dc] bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PieIcon size={18} className="text-emerald-700" />
              <p className="eyebrow text-emerald-800">Booking Health Ratio</p>
            </div>
            <h3 className="font-serif text-xl text-[#173d35] mt-1 font-bold">Payment &amp; Status Mix</h3>
          </div>

          <div className="relative h-56 w-full flex items-center justify-center my-2">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                    activeIndex={activePieIndex !== null ? activePieIndex : undefined}
                    activeShape={renderActiveShape}
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                    onClick={(_, index) => setActivePieIndex((prev) => (prev === index ? null : index))}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="transition-all duration-300 focus:outline-none"
                        style={{ outline: 'none', cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
              {activePieIndex !== null && statusDistribution[activePieIndex] ? (
                <motion.div
                  key={activePieIndex}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <span className="text-xs font-semibold text-slate-500">
                    {statusDistribution[activePieIndex].name}
                  </span>
                  <p className="text-2xl font-bold font-serif text-[#173d35]">
                    {statusDistribution[activePieIndex].value}
                  </p>
                </motion.div>
              ) : (
                <div className="text-center">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total</span>
                  <p className="text-2xl font-bold font-serif text-[#173d35]">{bookings.length}</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-[#f0f4ee] pt-4">
            {statusDistribution.map((item) => (
              <div
                key={item.name}
                className="flex flex-col items-center text-center p-1.5 rounded-xl bg-[#f8faf6]"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-slate-600">{item.name}</span>
                </div>
                <strong className="text-sm font-bold text-[#173d35]">{item.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Quick Operations & Insight Cards ───────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Flash Sales Insight Card */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-gradient-to-br from-white to-[#fbfcf8] p-5 shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800 mb-3">
            <Zap size={20} />
          </div>
          <h4 className="font-serif text-lg font-bold text-[#173d35]">Promotional Sales</h4>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Launch time-limited discount deals and promotional banner highlights.
          </p>
          <button
            onClick={() => onSelectTab(canManagePricing ? 'sales' : 'overview')}
            className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer"
          >
            {canManagePricing ? 'Configure Flash Sale' : 'View Campaigns'} <ChevronRight size={14} />
          </button>
        </motion.div>

        {/* Short Stays Insight Card */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-gradient-to-br from-white to-[#fbfcf8] p-5 shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 mb-3">
            <Clock3 size={20} />
          </div>
          <h4 className="font-serif text-lg font-bold text-[#173d35]">Day-Use / Short Stays</h4>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Manage hourly rates (2h, 3h, 4h, 5h) across bedrooms &amp; luxury pool villas.
          </p>
          <button
            onClick={() => onSelectTab('short_stays')}
            className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
          >
            Configure Short Stays <ChevronRight size={14} />
          </button>
        </motion.div>

        {/* 2FA Security Insight Card */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          className="stat-card-motion rounded-2xl border border-[#dfe7dc] bg-gradient-to-br from-white to-[#fbfcf8] p-5 shadow-xs"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-800 mb-3">
            <ShieldCheck size={20} />
          </div>
          <h4 className="font-serif text-lg font-bold text-[#173d35]">Staff &amp; 2FA Security</h4>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Super Admin protected 2FA OTP verification and staff access privileges.
          </p>
          <button
            onClick={() => onSelectTab(canManageRoles ? 'customers' : 'overview')}
            className="mt-4 flex items-center gap-1 text-xs font-bold text-sky-800 hover:text-sky-950 cursor-pointer"
          >
            {canManageRoles ? 'Manage Team Access' : 'Security Active'} <ChevronRight size={14} />
          </button>
        </motion.div>
      </div>

      {/* ─── Live Activity Stream ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between border-b border-[#eef2eb] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-emerald-700" />
            <h3 className="font-serif text-xl font-bold text-[#173d35]">Recent Reservation Activity</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">{bookings.length} Total Registered</span>
        </div>
        <div className="divide-y divide-[#f0f4ee]">
          {bookings.slice(0, 5).map((b) => (
            <div
              key={b.id}
              className="table-row-motion flex flex-wrap items-center justify-between gap-3 py-3 rounded-lg px-2"
            >
              <div>
                <p className="text-sm font-bold text-[#173d35]">{b.name || 'Guest'}</p>
                <p className="text-xs text-slate-500">
                  {b.service || 'Resort Stay'} ·{' '}
                  {b.checkIn ? new Date(b.checkIn).toLocaleDateString('en-IN') : 'Upcoming'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    b.paid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {b.paid ? '✓ Confirmed & Paid' : '⏳ Pending Payment'}
                </span>
                <strong className="text-sm font-mono text-[#173d35]">
                  ₹{Number(b.total_amount || b.amount || 0).toLocaleString('en-IN')}
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
