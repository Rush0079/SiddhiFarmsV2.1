/**
 * ============================================================================
 * TIME EDITOR MODAL COMPONENT — Check-in / Check-out Timings Adjustment
 * ============================================================================
 *
 * @fileoverview  Modal dialog allowing administrators to adjust custom check-in
 *                and check-out times for a specific reservation.
 *
 * @module        components/admin/time-editor-modal
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React from 'react'
import { Save, X, Loader2 } from 'lucide-react'

/**
 * TimeEditorModal Component
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.timeEditor   - Selected booking object { id, name, checkInTime, checkOutTime }.
 * @param {Function} props.setTimeEditor - State setter for timeEditor.
 * @param {Function} props.onSave        - Async callback to persist timings.
 * @param {boolean}  props.saving        - Loading state indicator.
 * @returns {JSX.Element|null}
 */
export default function TimeEditorModal({ timeEditor, setTimeEditor, onSave, saving }) {
  if (!timeEditor) return null

  console.log('[UI:TimeEditorModal:RENDER] Editing timings for booking:', timeEditor.id)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#102f29]/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-times-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Booking schedule</p>
            <h2 id="booking-times-title" className="mt-2 font-serif text-2xl">
              Set stay times
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {timeEditor.name} · {timeEditor.id}
            </p>
          </div>
          <button
            onClick={() => setTimeEditor(null)}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-slate-700">
            Check-in time
            <input
              type="time"
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
              value={timeEditor.checkInTime}
              onChange={(e) => setTimeEditor({ ...timeEditor, checkInTime: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Check-out time
            <input
              type="time"
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
              value={timeEditor.checkOutTime}
              onChange={(e) => setTimeEditor({ ...timeEditor, checkOutTime: e.target.value })}
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          Standard timings are 11:00 AM check-in and 10:00 AM check-out. The saved times appear on the customer invoice.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="button-outline"
            onClick={() => setTimeEditor(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button-primary flex items-center gap-2"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving…' : 'Save times'}
          </button>
        </div>
      </div>
    </div>
  )
}
