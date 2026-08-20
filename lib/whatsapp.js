import { BOOKING_TERMS } from '@/lib/booking-terms'

const RESORT_NAME = 'Siddhi Farm Resort'
const DEFAULT_PHONE = '7083682768'
const DEFAULT_MAP = 'https://maps.app.goo.gl/iBiKXi45sJ99vrV69'

function displayTime(value, fallback) {
  const [hours, minutes] = String(value || fallback).split(':').map(Number)
  return `${hours % 12 || 12}:${String(minutes || 0).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

function cleanPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 12 && digits.startsWith('91')) return digits
  return digits || '917083682768'
}

/**
 * Builds a structured, emoji-rich WhatsApp message containing full invoice & terms
 */
export function buildWhatsAppMessage(booking, appUrl = '') {
  if (!booking) return ''
  const baseAppUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'))
  const invoicePdfUrl = `${baseAppUrl}/invoice/${booking.id}`
  const payUrl = `${baseAppUrl}/pay/${booking.id}`

  const isAdvance = Number(booking.pending_amount || 0) > 0
  const isPaid = booking.paid
  const totalAmount = Number(booking.total_amount || (Number(booking.amount || 0) + Number(booking.pending_amount || 0)))
  const paidAmount = Number(booking.paid_amount || (isPaid ? booking.amount : 0))
  const pendingAmount = Number(booking.pending_amount || (isAdvance ? totalAmount - paidAmount : 0))

  const checkInTime = displayTime(booking.check_in_time, '11:00')
  const checkOutTime = displayTime(booking.check_out_time, '10:00')

  const rawTerms = Array.isArray(booking.terms_content) && booking.terms_content.length
    ? booking.terms_content
    : BOOKING_TERMS
  const isEvent = ['Engagement Ceremony', 'Birthday Party', 'Get Together', 'Wedding Ceremony'].includes(booking.service)
  const isDayTour = ['One Day Tour', 'Mini Water Park', 'One Day Tour + Mini Water Park', 'One Day Tour + Mini Adventure Park'].includes(booking.service)
  const isShortStay = booking.stay_type === 'short_stay' || (booking.notes || '').includes('Short Stay') || (booking.check_in === booking.check_out && !isEvent && !isDayTour)
  const typeHeader = isEvent ? '🎉 *SINGLE-DAY EVENT CELEBRATION*' : (isShortStay ? '🕒 *DAY USE / SHORT STAY*' : (isDayTour ? '🏊 *DAY TOUR & WATER PARK*' : '🏡 *OVERNIGHT RESORT STAY*'))

  const lines = [
    `🌴 *${RESORT_NAME.toUpperCase()}* 🌴`,
    `*OFFICIAL BOOKING CONFIRMATION & INVOICE*`,
    `─────────────────────────────`,
    `Dear *${booking.name}*, thank you for choosing ${RESORT_NAME}! Your reservation details are below:`,
    ``,
    `📋 *RESERVATION DETAILS* (${typeHeader})`,
    `• *Booking ID:* ${booking.id}`,
    `• *Service / Room:* ${booking.service}`,
    ...(isEvent ? [
      `• *Event Date:* ${booking.check_in}`,
      `• *Event Timings:* *${checkInTime} to ${checkOutTime}* (Single-Day Event)`,
      `• *Guests:* ${booking.guests} Guest(s)`,
    ] : isShortStay ? [
      `• *Visit Date:* ${booking.check_in}`,
      `• *Short Stay Slot:* *${checkInTime} to ${checkOutTime}* (Day Use)`,
      `• *Guests:* ${booking.guests} Guest(s)`,
    ] : isDayTour ? [
      `• *Visit Date:* ${booking.check_in}`,
      `• *Park Timings:* *${checkInTime} to ${checkOutTime}*`,
      `• *Guests:* ${booking.guests} Guest(s)`,
    ] : [
      `• *Check-in:* ${booking.check_in} at *${checkInTime}*`,
      `• *Check-out:* ${booking.check_out} at *${checkOutTime}*`,
      `• *Duration:* ${booking.nights} Night(s) · ${booking.guests} Guest(s)`,
    ]),
    ...(booking.aadhaar_number ? [`• *Govt ID (Aadhaar):* ${booking.aadhaar_number}`] : []),
    ``,
    `💳 *FINANCIAL BREAKDOWN & INVOICE*`,
    `• *Total Stay Value:* ₹${totalAmount.toLocaleString('en-IN')}`,
    ...(booking.discount ? [`• *Discount (${booking.applied_coupon || 'Coupon'}):* -₹${Number(booking.discount).toLocaleString('en-IN')}`] : []),
    `• *Amount Paid:* ₹${paidAmount.toLocaleString('en-IN')} ${isPaid ? '✓ (Verified)' : ''}`,
    ...(pendingAmount > 0 ? [
      `• *Pending Balance Due at Check-in:* *₹${pendingAmount.toLocaleString('en-IN')}*`,
      `• *Pay Balance Online:* ${payUrl}`,
    ] : [
      `• *Payment Status:* *PAID IN FULL ✓*`,
    ]),
    ``,
    `📄 *OFFICIAL PDF INVOICE & RECEIPT*`,
    `Click below to view, download, or print your official PDF invoice:`,
    `👉 ${invoicePdfUrl}`,
    ``,
    `📍 *RESORT ADDRESS & NAVIGATION*`,
    `• *Google Maps:* ${DEFAULT_MAP}`,
    `• *Helpline / WhatsApp:* +91 ${DEFAULT_PHONE}`,
    ``,
    `📜 *TERMS & CONDITIONS & HOUSE RULES*`,
    ...termsList.map((t, idx) => `${idx + 1}. ${t}`),
    ``,
    `─────────────────────────────`,
    `We look forward to welcoming you for a memorable stay at ${RESORT_NAME}! 🌿`,
  ]

  return lines.join('\n')
}

/**
 * Generates direct WhatsApp share URL (wa.me link)
 */
export function getWhatsAppShareUrl(booking, appUrl = '') {
  const phone = cleanPhone(booking.phone)
  const message = buildWhatsAppMessage(booking, appUrl)
  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
}

/**
 * Automatically sends WhatsApp message in background via configured cloud API / webhook gateway
 */
export async function sendAutomatedWhatsAppMessage(booking, appUrl = '') {
  if (!booking || !booking.phone) return { sent: false, reason: 'missing-booking-or-phone' }

  const phone = cleanPhone(booking.phone)
  const message = buildWhatsAppMessage(booking, appUrl)
  const baseAppUrl = appUrl || process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const invoicePdfUrl = `${baseAppUrl}/invoice/${booking.id}`

  // 1. Meta WhatsApp Business Cloud API
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    try {
      const endpoint = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phone,
          type: 'text',
          text: { preview_url: true, body: message },
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (res.ok) {
        console.log(`[WhatsApp Auto-Dispatch] Message sent via Meta Cloud API to ${phone} for booking ${booking.id}`)
        return { sent: true, provider: 'meta-cloud-api', data: result }
      } else {
        console.warn(`[WhatsApp Auto-Dispatch] Meta Cloud API returned error:`, result)
      }
    } catch (err) {
      console.error(`[WhatsApp Auto-Dispatch] Meta Cloud API request failed:`, err.message)
    }
  }

  // 2. Twilio WhatsApp API
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER) {
    try {
      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')
      const body = new URLSearchParams({
        From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        To: `whatsapp:+${phone}`,
        Body: message,
      })
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      const result = await res.json().catch(() => ({}))
      if (res.ok) {
        console.log(`[WhatsApp Auto-Dispatch] Message sent via Twilio to ${phone} for booking ${booking.id}`)
        return { sent: true, provider: 'twilio', data: result }
      }
    } catch (err) {
      console.error(`[WhatsApp Auto-Dispatch] Twilio request failed:`, err.message)
    }
  }

  // 3. UltraMsg API
  if (process.env.ULTRAMSG_INSTANCE_ID && process.env.ULTRAMSG_TOKEN) {
    try {
      const endpoint = `https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE_ID}/messages/chat`
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: process.env.ULTRAMSG_TOKEN,
          to: `+${phone}`,
          body: message,
        }),
      })
      const result = await res.json().catch(() => ({}))
      if (res.ok) {
        console.log(`[WhatsApp Auto-Dispatch] Message sent via UltraMsg to ${phone} for booking ${booking.id}`)
        return { sent: true, provider: 'ultramsg', data: result }
      }
    } catch (err) {
      console.error(`[WhatsApp Auto-Dispatch] UltraMsg request failed:`, err.message)
    }
  }

  // 4. Custom WhatsApp Webhook / Wati / Interakt
  if (process.env.WHATSAPP_WEBHOOK_URL) {
    try {
      const res = await fetch(process.env.WHATSAPP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: `+${phone}`,
          message,
          bookingId: booking.id,
          guestName: booking.name,
          invoiceUrl: invoicePdfUrl,
          amount: booking.amount,
          status: booking.status,
        }),
      })
      if (res.ok) {
        console.log(`[WhatsApp Auto-Dispatch] Message sent via Custom Webhook to ${phone} for booking ${booking.id}`)
        return { sent: true, provider: 'webhook' }
      }
    } catch (err) {
      console.error(`[WhatsApp Auto-Dispatch] Webhook request failed:`, err.message)
    }
  }

  // Default: Automated payload prepared and logged
  console.log(`[WhatsApp Auto-Dispatch] Confirmation payload ready for ${phone} (${booking.id}). Direct PDF Link: ${invoicePdfUrl}`)
  return { sent: false, reason: 'unconfigured-cloud-gateway', phone, invoiceUrl: invoicePdfUrl }
}
