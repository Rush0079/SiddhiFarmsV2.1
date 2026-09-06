'use client'

import React from 'react'
import { Save, X, Loader2 } from 'lucide-react'
import { TimeEditorDefaults } from './time-editor-modal.model'
import styles from './time-editor-modal.module.css'

export default function TimeEditorModal({ timeEditor, setTimeEditor, onSave, saving }) {
  if (!timeEditor) return null

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-times-title"
    >
      <div className={`${styles.modalCard} animate-in fade-in zoom-in-95 duration-200`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{TimeEditorDefaults.SUBTITLE}</p>
            <h2 id="booking-times-title" className="mt-2 font-serif text-2xl">
              {TimeEditorDefaults.TITLE}
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
              className={styles.timeInput}
              value={timeEditor.checkInTime}
              onChange={(e) => setTimeEditor({ ...timeEditor, checkInTime: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-slate-700">
            Check-out time
            <input
              type="time"
              className={styles.timeInput}
              value={timeEditor.checkOutTime}
              onChange={(e) => setTimeEditor({ ...timeEditor, checkOutTime: e.target.value })}
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-slate-500 leading-relaxed">
          {TimeEditorDefaults.DESCRIPTION}
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
