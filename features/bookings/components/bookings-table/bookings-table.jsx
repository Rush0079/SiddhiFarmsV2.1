'use client'

import React, { useState } from 'react'
import { Clock3, Share2, FileText, Trash2, Search } from 'lucide-react'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import { formatTime12h } from '@/lib/helpers/formatting'
import { filterBookings } from './bookings-table.model'
import styles from './bookings-table.module.css'

function displayBookingTime(value, fallback) {
  return formatTime12h(value || fallback)
}

export default function BookingsTable({
  bookings = [],
  canDelete = false,
  onUpdateTime,
  onMarkPaid,
  onMarkBalancePaid,
  onUpdateStatus,
  onDelete,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredBookings = filterBookings(bookings, searchQuery, statusFilter)

  return (
    <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef2eb] pb-5">
        <div>
          <p className="eyebrow">Booking desk</p>
          <h2 className="mt-1 font-serif text-2xl text-[#173d35]">Guest Reservations</h2>
          <p className="mt-1 text-xs text-slate-500">
            Real-time reservation requests, payment verification, and schedule management.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, phone, service…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] pl-8 pr-3 py-1.5 text-xs text-[#173d35] outline-none focus:border-[#315d4c]"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-[#f3f5ef] p-1 border border-[#dfe7dc] text-xs font-medium">
            {['all', 'confirmed', 'pending', 'cancelled'].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`rounded-lg px-2.5 py-1 capitalize transition cursor-pointer ${
                  statusFilter === filter
                    ? 'bg-[#173d35] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-3 font-semibold">Guest</th>
              <th className="p-3 font-semibold">Stay / Experience</th>
              <th className="p-3 font-semibold">Dates</th>
              <th className="p-3 font-semibold">Stay Times</th>
              <th className="p-3 font-semibold">Total</th>
              <th className="p-3 font-semibold">Payment</th>
              <th className="p-3 font-semibold">Status & Actions</th>
              {canDelete && <th className="p-3 font-semibold text-right">Delete</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef2eb]">
            {filteredBookings.map((item) => (
              <tr className="transition-colors hover:bg-[#fbfcfb]" key={item.id}>
                {/* Guest Info */}
                <td className="p-3">
                  <strong className="text-slate-900">{item.name}</strong>
                  <br />
                  <span className="text-xs text-slate-400">{item.phone}</span>
                </td>

                {/* Service Name & Stay Type Tag */}
                <td className="p-3">
                  <span className="font-medium text-[#173d35]">{item.service}</span>
                  {item.stay_type === 'short_stay' && (
                    <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Short Stay
                    </span>
                  )}
                </td>

                {/* Dates */}
                <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                  {item.check_in} → {item.check_out}
                </td>

                {/* Times with Editor Trigger */}
                <td className="p-3">
                  <span className="block text-xs text-slate-600">
                    In {displayBookingTime(item.check_in_time, '11:00')} · Out{' '}
                    {displayBookingTime(item.check_out_time, '10:00')}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateTime({
                        id: item.id,
                        name: item.name,
                        checkInTime: item.check_in_time?.slice(0, 5) || '11:00',
                        checkOutTime: item.check_out_time?.slice(0, 5) || '10:00',
                      })
                    }
                    className="mt-1 flex items-center gap-1 text-[10px] text-[#315d4c] font-semibold hover:underline cursor-pointer"
                  >
                    <Clock3 size={12} /> Set times
                  </button>
                </td>

                {/* Total Cost */}
                <td className="p-3 font-semibold text-xs text-slate-900">
                  ₹
                  {Number(
                    item.total_amount ||
                      Number(item.amount || 0) + Number(item.pending_amount || 0)
                  ).toLocaleString('en-IN')}
                </td>

                {/* Payment Status & Balance Action */}
                <td className="p-3">
                  {item.pending_amount > 0 ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                        Adv. ₹
                        {Number(item.paid_amount || (item.paid ? item.amount : 0)).toLocaleString(
                          'en-IN'
                        )}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700">
                        ₹{Number(item.pending_amount).toLocaleString('en-IN')} Pending
                      </span>
                      <button
                        onClick={() => onMarkBalancePaid(item)}
                        className="mt-0.5 rounded-full border border-green-600 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-800 hover:bg-green-100 cursor-pointer"
                      >
                        Clear balance
                      </button>
                    </div>
                  ) : item.paid ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                      Paid in full ✓
                    </span>
                  ) : (
                    <span className="flex flex-col items-start gap-1">
                      {(item.notes || '').includes('UPI claim') && (
                        <span
                          className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-700"
                          title={item.notes}
                        >
                          UPI claimed
                        </span>
                      )}
                      <button
                        onClick={() => onMarkPaid(item)}
                        className="rounded-full border border-[#b7c7b8] px-2.5 py-1 text-[10px] font-medium text-[#315d4c] hover:bg-[#e3eee1] cursor-pointer"
                      >
                        Mark paid
                      </button>
                    </span>
                  )}
                </td>

                {/* Status Dropdown & Communication Actions */}
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <select
                      className="m-0 w-auto rounded-lg border border-slate-200 bg-white py-1.5 pl-2 text-xs font-medium text-slate-800"
                      value={item.status}
                      onChange={(e) => onUpdateStatus(item.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>

                    <a
                      href={getWhatsAppShareUrl(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Send Booking Invoice & Terms via WhatsApp"
                      className="flex items-center justify-center rounded-lg bg-[#25D366]/10 p-2 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                    >
                      <Share2 size={14} />
                    </a>

                    <a
                      href={`/invoice/${item.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View / Print PDF Tax Invoice"
                      className="flex items-center justify-center rounded-lg bg-[#173d35]/10 p-2 text-[#173d35] hover:bg-[#173d35] hover:text-white transition-colors"
                    >
                      <FileText size={14} />
                    </a>
                  </div>
                </td>

                {/* Delete Booking Action */}
                {canDelete && (
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onDelete(item.id)}
                      title="Delete booking request"
                      className="rounded-full p-2 text-red-500 hover:bg-red-100 transition cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!filteredBookings.length && (
          <p className="py-12 text-center text-sm text-slate-400">
            {searchQuery || statusFilter !== 'all'
              ? 'No bookings match your current search or filter criteria.'
              : 'New booking requests will appear here.'}
          </p>
        )}
      </div>
    </section>
  )
}
