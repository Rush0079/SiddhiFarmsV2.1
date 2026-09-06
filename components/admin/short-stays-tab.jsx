/**
 * ============================================================================
 * SHORT STAYS TAB COMPONENT — Day-Use Rates & Reservations Ledger
 * ============================================================================
 *
 * @fileoverview  Administer day-use / short-stay hourly rates (2h, 3h, 4h, 5h)
 *                across bedrooms and private pool villas, and track all same-day
 *                bookings.
 *
 * @module        components/admin/short-stays-tab
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { Check, Save, Share2, FileText, Trash2 } from 'lucide-react'
import { getWhatsAppShareUrl } from '@/lib/whatsapp'
import { formatTime12h } from '@/lib/helpers/formatting'

/**
 * ShortStaysTab Component
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.pricing          - Rate card object.
 * @param {Function} props.setPricing       - Pricing state setter.
 * @param {Array}    props.bookings         - List of all bookings.
 * @param {boolean}  props.canManagePricing - Permissions flag.
 * @param {boolean}  props.canDelete        - Permissions flag.
 * @param {boolean}  props.saved            - Save success indicator.
 * @param {Function} props.onSave           - Save callback.
 * @param {Function} props.onMarkPaid       - Mark paid callback.
 * @param {Function} props.onUpdateStatus   - Update status callback.
 * @param {Function} props.onDelete         - Delete booking callback.
 * @returns {JSX.Element}
 */
export default function ShortStaysTab({
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
  console.log('[UI:ShortStaysTab:RENDER] Rendering short stay rates & ledger')

  // Filter bookings for short stay / day-use reservations
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
    <div className="mt-8 space-y-8">
      {/* ─── Short Stay Room Pricing Manager ───────────────────────────── */}
      {canManagePricing && (
        <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow text-[#315d4c]">Hourly &amp; Day-Use Pricing</p>
              <h2 className="mt-1 font-serif text-2xl text-[#173d35]">Short Stay Room Rates</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">
                Configure base rates for same-day day-use stays (e.g. 2–5 hours). These rates apply
                automatically when guests select the Day Use / Short Stay duration.
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
            {/* Master Bedroom Short Stay */}
            <div className="rounded-xl border border-[#dfe7dc] bg-[#fbfcf9] p-4">
              <label className="text-xs font-semibold text-[#173d35] block">
                Master Bedroom (Short Stay)
                <div className="relative mt-2">
                  <span className="absolute left-3 top-3 text-sm text-slate-400">₹</span>
                  <input
                    className="pl-7 w-full rounded-lg border border-[#dfe7dc] bg-white py-2 text-sm text-[#173d35]"
                    type="number"
                    min="0"
                    placeholder="2500"
                    value={pricing.masterBedroomShortStay ?? ''}
                    onChange={(e) =>
                      setPricing({ ...pricing, masterBedroomShortStay: Number(e.target.value) })
                    }
                  />
                </div>
              </label>
              <p className="mt-2 text-[11px] text-slate-400">
                Overnight: ₹{(pricing.masterBedroom || 4500).toLocaleString('en-IN')}
              </p>
            </div>

            {/* 2 BHK Villa Short Stay */}
            <div className="rounded-xl border border-[#dfe7dc] bg-[#fbfcf9] p-4">
              <label className="text-xs font-semibold text-[#173d35] block">
                2 BHK Villa (Short Stay)
                <div className="relative mt-2">
                  <span className="absolute left-3 top-3 text-sm text-slate-400">₹</span>
                  <input
                    className="pl-7 w-full rounded-lg border border-[#dfe7dc] bg-white py-2 text-sm text-[#173d35]"
                    type="number"
                    min="0"
                    placeholder="6500"
                    value={pricing.villa2BHKShortStay ?? ''}
                    onChange={(e) =>
                      setPricing({ ...pricing, villa2BHKShortStay: Number(e.target.value) })
                    }
                  />
                </div>
              </label>
              <p className="mt-2 text-[11px] text-slate-400">
                Overnight: ₹{(pricing.villa2BHK || 11000).toLocaleString('en-IN')}
              </p>
            </div>

            {/* 4 BHK Villa Short Stay */}
            <div className="rounded-xl border border-[#dfe7dc] bg-[#fbfcf9] p-4">
              <label className="text-xs font-semibold text-[#173d35] block">
                4 BHK Villa (Short Stay)
                <div className="relative mt-2">
                  <span className="absolute left-3 top-3 text-sm text-slate-400">₹</span>
                  <input
                    className="pl-7 w-full rounded-lg border border-[#dfe7dc] bg-white py-2 text-sm text-[#173d35]"
                    type="number"
                    min="0"
                    placeholder="12000"
                    value={pricing.villa4BHKShortStay ?? ''}
                    onChange={(e) =>
                      setPricing({ ...pricing, villa4BHKShortStay: Number(e.target.value) })
                    }
                  />
                </div>
              </label>
              <p className="mt-2 text-[11px] text-slate-400">
                Overnight: ₹{(pricing.villa4BHK || 22000).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ─── Dedicated Short Stay Bookings Ledger ───────────────────────── */}
      <section className="rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eef2eb] pb-4">
          <div>
            <p className="eyebrow text-[#315d4c]">Same-Day Stays</p>
            <h3 className="mt-1 font-serif text-xl font-bold text-[#173d35]">
              Short Stay &amp; Day-Use Bookings
            </h3>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
            {shortStayBookings.length} Total Bookings
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-[#e5ebe1] text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-3 font-semibold">Guest</th>
                <th className="pb-3 font-semibold">Room / Villa</th>
                <th className="pb-3 font-semibold">Date &amp; Slot</th>
                <th className="pb-3 font-semibold">Total</th>
                <th className="pb-3 font-semibold">Payment</th>
                <th className="pb-3 font-semibold">Status</th>
                {canDelete && <th className="pb-3 font-semibold text-right">Delete</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#eef2eb]">
              {shortStayBookings.map((item) => (
                <tr className="transition-colors hover:bg-[#fbfcfb]" key={item.id}>
                  <td className="py-4">
                    <strong className="text-slate-900">{item.name}</strong>
                    <br />
                    <span className="text-xs text-slate-400">{item.phone}</span>
                  </td>
                  <td className="py-4 font-medium text-[#173d35]">{item.service}</td>
                  <td className="py-4 text-xs text-slate-600">
                    <p className="font-semibold text-slate-800">{item.check_in}</p>
                    <p className="text-slate-500">
                      {formatTime12h(item.check_in_time || '11:00')} →{' '}
                      {formatTime12h(item.check_out_time || '15:00')}
                    </p>
                  </td>
                  <td className="py-4 font-semibold text-xs text-slate-900">
                    ₹{Number(item.total_amount || item.amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-4">
                    {item.pending_amount > 0 ? (
                      <div className="flex flex-col items-start gap-1">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                          Adv. ₹
                          {Number(item.paid_amount || (item.paid ? item.amount : 0)).toLocaleString(
                            'en-IN'
                          )}
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">
                          ₹{Number(item.pending_amount).toLocaleString('en-IN')} Due
                        </span>
                      </div>
                    ) : item.paid ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        Paid in full ✓
                      </span>
                    ) : (
                      <button
                        onClick={() => onMarkPaid(item)}
                        className="rounded-full border border-[#b7c7b8] px-2.5 py-1 text-[10px] font-medium text-[#315d4c] hover:bg-[#e3eee1] cursor-pointer"
                      >
                        Mark paid
                      </button>
                    )}
                  </td>
                  <td className="py-4">
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
                        title="Send WhatsApp Receipt"
                        className="flex items-center justify-center rounded-lg bg-[#25D366]/10 p-2 text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
                      >
                        <Share2 size={14} />
                      </a>

                      <a
                        href={`/invoice/${item.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View PDF Tax Invoice"
                        className="flex items-center justify-center rounded-lg bg-[#173d35]/10 p-2 text-[#173d35] hover:bg-[#173d35] hover:text-white transition-colors"
                      >
                        <FileText size={14} />
                      </a>
                    </div>
                  </td>
                  {canDelete && (
                    <td className="py-4 text-right">
                      <button
                        onClick={() => onDelete(item.id)}
                        title="Delete booking"
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

          {!shortStayBookings.length && (
            <p className="py-12 text-center text-sm text-slate-400">
              No short-stay bookings yet. When customers book day-use slots, they will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
