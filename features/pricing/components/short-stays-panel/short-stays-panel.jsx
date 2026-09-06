'use client'

import React from 'react'
import { Check, Save, Share2, FileText, Trash2 } from 'lucide-react'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import { formatTime12h } from '@/lib/helpers/formatting'
import { ShortStayDefaults, ShortStayRooms } from './short-stays-panel.model'
import styles from './short-stays-panel.module.css'

export default function ShortStaysPanel({
  pricing = {},
  setPricing,
  bookings = [],
  canManagePricing = false,
  canDelete = false,
  saved = false,
  onSave,
  onMarkPaid,
  onUpdateStatus,
  onDelete,
}) {
  const shortStayBookings = bookings.filter(
    (b) =>
      b.stay_type === 'short_stay' ||
      (b.check_in === b.check_out &&
        ![
          'One Day Tour',
          'Mini Water Park',
          'Wedding Ceremony',
          'Engagement Ceremony',
          'Birthday Party',
          'Get Together',
        ].includes(b.service))
  )

  return (
    <div className={styles.panelContainer}>
      {/* ─── Short Stay Room Pricing Manager ───────────────────────────── */}
      {canManagePricing && (
        <section className={styles.rateCard}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-[#315d4c]">Hourly &amp; Day-Use Pricing</p>
              <h2 className="mt-1 font-serif text-2xl text-[#173d35]">{ShortStayDefaults.TITLE}</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
                {ShortStayDefaults.SUBTITLE}
              </p>
            </div>
            <button className="button-primary" onClick={onSave}>
              {saved ? (
                <>
                  <Check size={16} /> Saved
                </>
              ) : (
                <>
                  <Save size={16} /> Save Short Stay Rates
                </>
              )}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {ShortStayRooms.map((room) => (
              <div key={room.key} className="rounded-xl border border-[#dfe7dc] bg-[#fbfcf9] p-4">
                <label className="text-xs font-semibold text-[#173d35] block">
                  {room.label} (Short Stay)
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-3 text-sm text-slate-400">₹</span>
                    <input
                      className="pl-7 w-full rounded-lg border border-[#dfe7dc] bg-white py-2 text-sm text-[#173d35] outline-none"
                      type="number"
                      min="0"
                      value={pricing[room.key] ?? ''}
                      onChange={(e) =>
                        setPricing({ ...pricing, [room.key]: Number(e.target.value) })
                      }
                    />
                  </div>
                </label>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Short Stay Bookings Ledger ─────────────────────────────────── */}
      <section className={styles.rateCard}>
        <div className="border-b border-[#eef2eb] pb-4">
          <p className="eyebrow text-[#315d4c]">Live Schedule</p>
          <h2 className="mt-1 font-serif text-2xl text-[#173d35]">Day-Use Reservations</h2>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Guest</th>
                <th className="pb-3 font-semibold">Room / Villa</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Slot Hours</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Payment</th>
                <th className="pb-3 font-semibold">Actions</th>
                {canDelete && <th className="pb-3 font-semibold text-right">Delete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2eb]">
              {shortStayBookings.map((b) => (
                <tr key={b.id} className="transition-colors hover:bg-[#fbfcfb]">
                  <td className="py-3">
                    <strong className="text-slate-900">{b.name}</strong>
                    <br />
                    <span className="text-xs text-slate-400">{b.phone}</span>
                  </td>
                  <td className="py-3 font-medium text-[#173d35]">{b.service}</td>
                  <td className="py-3 text-xs text-slate-600">{b.check_in}</td>
                  <td className="py-3 text-xs font-mono text-slate-700">
                    {formatTime12h(b.check_in_time || '11:00')} → {formatTime12h(b.check_out_time || '15:00')}
                  </td>
                  <td className="py-3 text-xs font-semibold text-slate-900">
                    ₹{Number(b.amount).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3">
                    {b.paid ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Paid ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => onMarkPaid(b)}
                        className="rounded-full border border-[#b7c7b8] px-2 py-0.5 text-[10px] font-medium text-[#315d4c] hover:bg-[#e3eee1]"
                      >
                        Mark paid
                      </button>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded border border-slate-200 bg-white py-1 px-1.5 text-xs"
                        value={b.status}
                        onChange={(e) => onUpdateStatus(b.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <a
                        href={getWhatsAppShareUrl(b)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded bg-[#25D366]/10 p-1.5 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                      >
                        <Share2 size={13} />
                      </a>
                    </div>
                  </td>
                  {canDelete && (
                    <td className="py-3 text-right">
                      <button
                        onClick={() => onDelete(b.id)}
                        className="rounded-full p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!shortStayBookings.length && (
            <p className="py-8 text-center text-xs text-slate-400">No short stay reservations recorded.</p>
          )}
        </div>
      </section>
    </div>
  )
}
