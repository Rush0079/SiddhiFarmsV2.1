'use client'

import React, { useRef } from 'react'
import { Image as ImageIcon, RotateCcw, Upload, Loader2, ScrollText, Check, Save } from 'lucide-react'
import { IMAGE_SECTIONS } from '@/lib/siteImages'
import { ContentManagerDefaults } from './content-manager.model'
import styles from './content-manager.module.css'

export default function ContentManager({
  images = {},
  uploadingKey,
  pendingImageKey,
  onPickImageFile,
  onSetImageUrl,
  onUploadImage,
  bookingTerms = { version: '', terms: [] },
  setBookingTerms,
  termsText = '',
  setTermsText,
  termsSaved = false,
  onSaveTerms,
}) {
  const fileInputRef = useRef(null)

  return (
    <div className={styles.contentContainer}>
      {/* ─── Photographic Media Manager ────────────────────────────────── */}
      <section className={styles.cardSection}>
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">{ContentManagerDefaults.SUBTITLE}</p>
            <h2 className="mt-2 font-serif text-2xl text-[#173d35]">{ContentManagerDefaults.TITLE}</h2>
          </div>
          <ImageIcon size={19} className="text-[#709079]" />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Upload a new photo, or paste an image URL and press Enter. Reset returns a slot to its built-in photo.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f && pendingImageKey) onUploadImage?.(pendingImageKey, f)
            e.target.value = ''
          }}
        />

        {IMAGE_SECTIONS.map((section) => (
          <div key={section.title} className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">
              {section.title}
            </p>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              {section.slots.map((slot) => {
                const override = images[slot.key]
                return (
                  <div
                    key={slot.key}
                    className={styles.slotCard}
                  >
                    <img
                      src={override || slot.def}
                      alt={slot.label}
                      className={styles.slotThumb}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#173d35]">
                        {slot.label}
                        {override && (
                          <span className={styles.customBadge}>
                            Custom
                          </span>
                        )}
                      </p>
                      <input
                        key={`${slot.key}:${override || ''}`}
                        className="mt-1 w-full rounded-lg border border-[#dfe7dc] bg-white px-2.5 py-1 text-xs text-[#173d35]"
                        defaultValue={override || ''}
                        placeholder="Paste image URL and press Enter"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            onSetImageUrl?.(slot.key, e.currentTarget.value.trim())
                          }
                        }}
                      />
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        title="Upload photo"
                        onClick={() => {
                          onPickImageFile?.(slot.key)
                          fileInputRef.current?.click()
                        }}
                        disabled={uploadingKey === slot.key}
                        className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                      >
                        {uploadingKey === slot.key ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Upload size={15} />
                        )}
                      </button>
                      {override && (
                        <button
                          title="Reset to default"
                          onClick={() => onSetImageUrl?.(slot.key, '')}
                          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 transition cursor-pointer"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ─── Booking Terms & Legal Conditions ──────────────────────────── */}
      <section className={styles.cardSection}>
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">{ContentManagerDefaults.TERMS_SUBTITLE}</p>
            <h2 className="mt-2 font-serif text-2xl text-[#173d35]">
              {ContentManagerDefaults.TERMS_TITLE}
            </h2>
          </div>
          <ScrollText size={19} className="text-[#709079]" />
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Use one line per condition. A booking stores the exact version and terms accepted, then emails that same copy to the customer.
        </p>

        <div className="mt-6 max-w-4xl space-y-5">
          <label className="block max-w-sm text-xs font-semibold text-slate-700">
            Terms version
            <input
              className="mt-1.5 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
              value={bookingTerms.version || ''}
              placeholder="e.g. 2026-08-16"
              onChange={(e) =>
                setBookingTerms?.({ ...bookingTerms, version: e.target.value })
              }
            />
          </label>
          <label className="block text-xs font-semibold text-slate-700">
            Terms and conditions
            <span className="mt-1 block text-xs font-normal normal-case text-slate-400">
              One condition per line
            </span>
            <textarea
              rows="12"
              className="mt-2 min-h-72 w-full resize-y rounded-xl border border-[#cfdacc] bg-[#fbfcf9] px-4 py-3 leading-6 text-[#173d35] outline-none transition focus:border-[#315d4c] focus:ring-2 focus:ring-[#dce9d9]"
              value={termsText}
              placeholder="One condition per line"
              onChange={(e) => setTermsText?.(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-6 flex max-w-4xl justify-end">
          <button className="button-primary flex items-center gap-1.5 cursor-pointer" onClick={onSaveTerms}>
            {termsSaved ? (
              <>
                <Check size={15} /> Saved
              </>
            ) : (
              <>
                <Save size={15} /> Save booking terms
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  )
}
