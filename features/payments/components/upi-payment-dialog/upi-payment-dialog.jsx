'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, QrCode, Smartphone } from 'lucide-react'
import { UpiDialogDefaults } from './upi-payment-dialog.model'
import { buildUpiDeepLink, PaymentClaimStatus } from '../../models/payment.model'
import { PaymentService } from '../../services/payment.service'
import styles from './upi-payment-dialog.module.css'

export default function UpiPaymentDialog({ booking }) {
  const [config, setConfig] = useState(null)
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [state, setState] = useState(PaymentClaimStatus.IDLE)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    PaymentService.getConfig().then(res => {
      if (res.success) setConfig(res.config)
    }).catch(() => {})
  }, [])

  if (!config || (!config.upiId && !config.qrUrl)) return null

  const amount = Number(booking?.amount) || 0
  const upiLink = buildUpiDeepLink({
    upiId: config.upiId,
    upiName: config.upiName,
    amount,
    bookingId: booking?.id,
  })

  async function claim() {
    setState(PaymentClaimStatus.SENDING)
    setError('')
    const res = await PaymentService.claimUpiPayment({
      bookingId: booking.id,
      reference,
    })

    if (!res.success) {
      setError(res.error || 'Could not record your payment')
      setState(PaymentClaimStatus.ERROR)
      return
    }
    setState(PaymentClaimStatus.DONE)
  }

  if (state === PaymentClaimStatus.DONE) {
    return (
      <div className="mt-4 rounded-xl bg-[#e5efe4] p-4 text-sm text-[#173d35]">
        <p className="font-medium"><Check size={15} className="mr-1 inline" /> {UpiDialogDefaults.SUCCESS_TITLE}</p>
        <p className="mt-1 text-xs text-slate-600">Our team will verify the UPI payment for booking <strong>{booking?.id}</strong> and confirm it shortly.</p>
      </div>
    )
  }

  return (
    <div className={styles.upiWrapper}>
      <button type="button" className="button-outline w-full" onClick={() => setOpen(!open)}>
        <QrCode size={16} /> {UpiDialogDefaults.TOGGLE_BUTTON}
      </button>
      {open && (
        <div className={styles.upiDetailsCard}>
          {config.qrUrl && (
            <img
              src={config.qrUrl}
              alt="UPI payment QR code"
              className={styles.qrImage}
            />
          )}
          {config.upiId && (
            <p className="mt-3 text-sm">
              UPI ID · <strong>{config.upiId}</strong>
              <button
                type="button"
                className="ml-2 rounded-full p-1 align-middle text-[#315d4c] hover:bg-[#e3eee1]"
                title="Copy UPI ID"
                onClick={() => {
                  navigator.clipboard?.writeText(config.upiId)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Pay exactly ₹{amount.toLocaleString('en-IN')} and mention booking {booking?.id} in the payment note.
          </p>
          {upiLink && (
            <a href={upiLink} className="button-primary mt-3 w-full sm:hidden">
              <Smartphone size={15} /> Open UPI app
            </a>
          )}
          <input
            className="mt-3 w-full text-sm"
            placeholder="UPI transaction ID / UTR (optional)"
            value={reference}
            onChange={e => setReference(e.target.value)}
          />
          <button
            type="button"
            className="button-gold mt-3 w-full"
            onClick={claim}
            disabled={state === PaymentClaimStatus.SENDING}
          >
            {state === PaymentClaimStatus.SENDING ? UpiDialogDefaults.RECORDING_BUTTON_TEXT : UpiDialogDefaults.CLAIM_BUTTON_TEXT}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
