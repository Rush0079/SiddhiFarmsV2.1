'use client'

import React, { useRef } from 'react'
import { QrCode, Check, Save, Upload, Loader2 } from 'lucide-react'
import { PaymentsConfigDefaults } from './payments-config.model'
import styles from './payments-config.module.css'

export default function PaymentsConfig({
  payments = {},
  setPayments,
  paySaved = false,
  qrUploading = false,
  onSave,
  onUploadQr,
  onRemoveQr,
}) {
  const qrInputRef = useRef(null)

  return (
    <section className={styles.configCard}>
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">{PaymentsConfigDefaults.SUBTITLE}</p>
          <h2 className="mt-2 font-serif text-2xl text-[#173d35]">{PaymentsConfigDefaults.TITLE}</h2>
        </div>
        <QrCode size={19} className="text-[#709079]" />
      </div>

      <p className="mt-2 text-sm text-slate-500 max-w-3xl leading-relaxed">
        {PaymentsConfigDefaults.DESCRIPTION}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-semibold text-slate-700">
          UPI ID
          <input
            placeholder="siddhifarm@ybl"
            value={payments.upiId || ''}
            onChange={(e) => setPayments({ ...payments, upiId: e.target.value })}
            className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Payee name
          <input
            placeholder="Siddhi Farm Resort"
            value={payments.upiName || ''}
            onChange={(e) => setPayments({ ...payments, upiName: e.target.value })}
            className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35] outline-none"
          />
        </label>
        <button className="button-primary flex items-center gap-1.5" onClick={onSave}>
          {paySaved ? (
            <>
              <Check size={15} /> Saved
            </>
          ) : (
            <>
              <Save size={15} /> Save
            </>
          )}
        </button>
      </div>

      {/* UPI QR Code Artwork */}
      <div className={styles.qrContainer}>
        {payments.qrUrl ? (
          <img
            src={payments.qrUrl}
            alt="UPI QR code"
            className="h-32 w-32 rounded-xl border border-[#e5ebe1] bg-white object-contain p-2 shadow-xs"
          />
        ) : (
          <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-[#c6d2c3] text-[#709079] bg-[#fcfdfa]">
            <QrCode size={28} />
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            className="button-outline text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
            onClick={() => qrInputRef.current?.click()}
            disabled={qrUploading}
          >
            {qrUploading ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload size={15} /> {payments.qrUrl ? 'Replace QR code' : 'Upload QR code'}
              </>
            )}
          </button>
          {payments.qrUrl && (
            <button
              type="button"
              className="block text-xs text-red-500 hover:underline cursor-pointer"
              onClick={onRemoveQr}
            >
              Remove QR code
            </button>
          )}
          <p className="text-xs text-slate-400">
            Export the QR from your UPI app (GPay / PhonePe / Paytm business).
          </p>
        </div>

        <input
          ref={qrInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUploadQr(f)
            e.target.value = ''
          }}
        />
      </div>
    </section>
  )
}
