/**
 * ============================================================================
 * ADVANCE CODES TAB COMPONENT — Single-Use Deposit Token Generator
 * ============================================================================
 *
 * @fileoverview  Administer 1-time single-use advance payment deposit tokens.
 *                Splits stay bills into a deposit amount + pending balance due
 *                upon check-in. The token auto-deletes upon customer reservation.
 *
 * @module        components/admin/advance-codes-tab
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'

/**
 * AdvanceCodesTab Component
 *
 * @component
 * @param {Object}   props
 * @param {Array}    props.advanceCodes    - Active advance codes.
 * @param {Object}   props.advanceForm     - Form state { code, percentage, fixedAmount }.
 * @param {Function} props.setAdvanceForm  - State setter for advanceForm.
 * @param {Function} props.onCreateCode    - Callback to create an advance code.
 * @param {Function} props.onDeleteCode    - Callback to delete an advance code.
 * @returns {JSX.Element}
 */
export default function AdvanceCodesTab({
  advanceCodes = [],
  advanceForm,
  setAdvanceForm,
  onCreateCode,
  onDeleteCode,
}) {
  console.log('[UI:AdvanceCodesTab:RENDER] Rendering advance deposit tokens manager')

  return (
    <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Deposit &amp; Partial Payments</p>
          <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Advance Payment Codes</h2>
        </div>
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
          Single-Use (1x) Auto-Delete
        </span>
      </div>

      <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 leading-relaxed">
        <strong>💡 Strict Guideline:</strong> These are <strong>Advance Deposit Tokens</strong> (NOT discount coupons).
        They split the customer's total stay bill into a deposit today + pending balance due upon arrival. As soon as a customer completes a booking with a code, it is <strong>automatically deleted</strong> from this window so it cannot be reused.
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <form
          onSubmit={onCreateCode}
          className="rounded-xl border border-[#dfe7dc] bg-[#f9faf6] p-5 space-y-4"
        >
          <h3 className="font-semibold text-sm text-[#173d35]">Generate 1-Time Advance Code</h3>

          <label className="block text-xs font-semibold text-slate-700">
            Code Name
            <input
              required
              placeholder="e.g. ADVANCE50"
              value={advanceForm.code}
              onChange={(e) =>
                setAdvanceForm({ ...advanceForm, code: e.target.value.toUpperCase() })
              }
              className="mt-1 w-full uppercase font-mono tracking-wider rounded-xl border border-[#dfe7dc] bg-white px-3 py-2 text-sm text-[#173d35]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-slate-700">
              Deposit Percentage (%)
              <input
                type="number"
                min="1"
                max="99"
                placeholder="50"
                value={advanceForm.percentage}
                onChange={(e) =>
                  setAdvanceForm({ ...advanceForm, percentage: e.target.value, fixedAmount: '' })
                }
                className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-2 text-sm text-[#173d35]"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700">
              OR Fixed Deposit (₹)
              <input
                type="number"
                min="1"
                placeholder="Optional"
                value={advanceForm.fixedAmount}
                onChange={(e) =>
                  setAdvanceForm({ ...advanceForm, fixedAmount: e.target.value, percentage: '' })
                }
                className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-white px-3 py-2 text-sm text-[#173d35]"
              />
            </label>
          </div>

          <p className="text-[11px] text-slate-500">
            Default is 50% advance deposit. The guest pays 50% online and owes the remaining 50% at check-in.
          </p>

          <button className="button-primary w-full flex items-center justify-center gap-2" type="submit">
            <Plus size={16} /> Create Single-Use Advance Code
          </button>
        </form>

        <div>
          <h3 className="font-semibold text-sm text-[#173d35] mb-3">
            Active Advance Codes ({advanceCodes.length})
          </h3>
          <div className="space-y-2">
            {advanceCodes.length ? (
              advanceCodes.map((item) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-[#e5ebe1] bg-white px-4 py-3 text-sm shadow-xs"
                  key={item.id}
                >
                  <div>
                    <strong className="font-mono text-base text-[#173d35]">{item.code}</strong>
                    <span className="ml-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 font-medium">
                      {item.percentage ? `${item.percentage}% Deposit` : `₹${item.fixedAmount} Deposit`}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Single-use · Auto-deletes on booking
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteCode(item.id)}
                    title="Delete code"
                    className="rounded-full p-2 text-red-500 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">
                No active advance codes. Create one above when a customer requests partial deposit booking.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
