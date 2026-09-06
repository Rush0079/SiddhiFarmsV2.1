/**
 * ============================================================================
 * PAYMENTS TAB COMPONENT — Direct UPI Fallback Configuration
 * ============================================================================
 *
 * @fileoverview  Administer UPI VPA (ID), Payee Name, and UPI QR code graphic
 *                provided as fallback payment channels when credit cards or
 *                Razorpay gateway transactions are unavailable.
 *
 * @module        components/admin/payments-tab
 * @author        Rushikesh Nigade (Siddhi Farms Engineering)
 * @version       2.1.0
 */

'use client'

import React, { useRef } from 'react'
import { QrCode, Check, Save, Upload, Loader2 } from 'lucide-react'

/**
 * PaymentsTab Component
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.payments     - Payments config { upiId, upiName, qrUrl }.
 * @param {Function} props.setPayments  - State setter for payments.
 * @param {boolean}  props.paySaved     - Save success indicator.
 * @param {boolean}  props.qrUploading  - QR upload loading indicator.
 * @param {Function} props.onSave       - Callback to save payment settings.
 * @param {Function} props.onUploadQr   - Callback to upload a QR code image file.
 * @param {Function} props.onRemoveQr   - Callback to remove the active QR code.
 * @returns {JSX.Element}
 */
export default function PaymentsTab({
  payments = {},
  setPayments,
  paySaved = false,
  qrUploading = false,
  onSave,
  onUploadQr,
  onRemoveQr,
}) {
  console.log('[UI:PaymentsTab:RENDER] Rendering UPI payments configuration')

  const qrInputRef = useRef(null)

  return (
    <section className="mt-8 rounded-2xl border border-[#dfe7dc] bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">UPI fallback</p>
          <h2 className="mt-2 font-serif text-2xl text-[#173d35]">Direct UPI payments</h2>
        </div>
        <QrCode size={19} className="text-[#709079]" />
      </div>

      <p className="mt-2 text-sm text-slate-500 max-w-3xl leading-relaxed">
        Shown to guests as a backup when Razorpay doesn't work. Leave both fields empty to hide the option. Guests who pay this way appear as "UPI claimed" in the booking desk — verify in your UPI app, then Mark paid.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-xs font-semibold text-slate-700">
          UPI ID
          <input
            placeholder="siddhifarm@ybl"
            value={payments.upiId || ''}
            onChange={(e) => setPayments({ ...payments, upiId: e.target.value })}
            className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          Payee name
          <input
            placeholder="Siddhi Farm Resort"
            value={payments.upiName || ''}
            onChange={(e) => setPayments({ ...payments, upiName: e.target.value })}
            className="mt-1 w-full rounded-xl border border-[#dfe7dc] bg-[#fbfdf9] px-3 py-2 text-sm text-[#173d35]"
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
      <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-[#eef2eb]">
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
