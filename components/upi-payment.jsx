'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, QrCode, Smartphone } from 'lucide-react'

// Fallback payment path when Razorpay is unavailable; hidden unless admin configured UPI/QR.
export default function UpiPayment({ booking }) {
  const [config, setConfig] = useState(null)
  const [open, setOpen] = useState(false)
  const [reference, setReference] = useState('')
  const [state, setState] = useState('idle') // idle | sending | done | error
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/payments/config').then(r => r.json()).then(setConfig).catch(() => {})
  }, [])

  if (!config || (!config.upiId && !config.qrUrl)) return null

  const amount = Number(booking.amount) || 0
  const upiLink = config.upiId
    ? `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.upiName || 'Siddhi Farm Resort')}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Booking ${booking.id}`)}`
    : null

  async function claim() {
    setState('sending'); setError('')
    const res = await fetch('/api/payments/upi-claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bookingId: booking.id, reference: reference.trim() }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error || 'Could not record your payment'); setState('error'); return }
    setState('done')
  }

  if (state === 'done') {
    return (
      <div className="mt-4 rounded-xl bg-[#e5efe4] p-4 text-sm text-[#173d35]">
        <p className="font-medium"><Check size={15} className="mr-1 inline" /> Payment noted — pending verification</p>
        <p className="mt-1 text-xs text-slate-600">Our team will verify the UPI payment for booking <strong>{booking.id}</strong> and confirm it shortly.</p>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <button type="button" className="button-outline w-full" onClick={() => setOpen(!open)}>
        <QrCode size={16} /> Razorpay not working? Pay via UPI{config.qrUrl ? ' / QR code' : ''}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-[#dfe7dc] bg-[#f7f9f4] p-4 text-center">
          {config.qrUrl && <img src={config.qrUrl} alt="UPI payment QR code" className="mx-auto h-44 w-44 rounded-lg bg-white object-contain p-2" />}
          {config.upiId && (
            <p className="mt-3 text-sm">
              UPI ID · <strong>{config.upiId}</strong>
              <button type="button" className="ml-2 rounded-full p-1 align-middle text-[#315d4c] hover:bg-[#e3eee1]" title="Copy UPI ID" onClick={() => { navigator.clipboard?.writeText(config.upiId); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">Pay exactly ₹{amount.toLocaleString('en-IN')} and mention booking {booking.id} in the payment note.</p>
          {upiLink && <a href={upiLink} className="button-primary mt-3 w-full sm:hidden"><Smartphone size={15} /> Open UPI app</a>}
          <input className="mt-3 w-full text-sm" placeholder="UPI transaction ID / UTR (optional)" value={reference} onChange={e => setReference(e.target.value)} />
          <button type="button" className="button-gold mt-3 w-full" onClick={claim} disabled={state === 'sending'}>
            {state === 'sending' ? 'Recording…' : 'I have paid via UPI'}
          </button>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  )
}
