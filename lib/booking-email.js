import ExcelJS from 'exceljs'
import nodemailer from 'nodemailer'
import { normaliseBookingTerms } from '@/lib/booking-terms'

const RESORT_NAME = 'Siddhi Farm Resort'
const DEFAULT_CONTACT_PHONE = '9552265572'
const DEFAULT_MAP_URL = 'https://maps.app.goo.gl/iBiKXi45sJ99vrV69'
const DEFAULT_CHECK_IN_TIME = '11:00'
const DEFAULT_CHECK_OUT_TIME = '10:00'
const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const DATE = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' })
const DATE_TIME = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

function safe(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])
}

function date(value, withTime = false) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : (withTime ? DATE_TIME : DATE).format(parsed)
}

function displayTime(value, fallback) {
  const [hours, minutes] = String(value || fallback).split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes || 0).padStart(2, '0')} ${suffix}`
}

function invoiceRows(booking) {
  const pending = Number(booking.pending_amount || 0)
  const paidSoFar = Number(booking.paid_amount || (booking.paid ? booking.amount : 0))
  const total = Number(booking.total_amount || (Number(booking.amount || 0) + pending))

  const isShortStay = booking.stay_type === 'short_stay' || Boolean(booking.is_short_stay)
  const isDayTour = ['One Day Tour', 'Mini Water Park', 'One Day Tour + Mini Water Park', 'One Day Tour + Mini Adventure Park'].includes(booking.service)
  const isEvent = ['Engagement Ceremony', 'Birthday Party', 'Get Together', 'Wedding Ceremony'].includes(booking.service)
  const bookingTypeLabel = isEvent ? 'Event Reservation (1 Day)' : (isShortStay ? 'Day Use / Short Stay' : (isDayTour ? 'Day Tour & Water Park' : 'Overnight Stay'))

  return [
    ['Booking ID', booking.id],
    ['Guest', booking.name],
    ['Phone', booking.phone],
    ['Service / Occasion', booking.service],
    ['Reservation Type', bookingTypeLabel],
    ['Guests', `${booking.guests} Guest(s)`],
    ...(isEvent ? [
      ['Event Date', date(booking.check_in)],
      ['Event Timings', `${displayTime(booking.check_in_time, '09:00')} to ${displayTime(booking.check_out_time, '22:00')} (Single-Day Event)`],
      ['Duration', '1 Day Package'],
    ] : isShortStay ? [
      ['Stay Date', date(booking.check_in)],
      ['Short Stay Hours', `${displayTime(booking.check_in_time, '11:00')} to ${displayTime(booking.check_out_time, '15:00')} (Day Use)`],
      ['Duration', 'Day Use / Short Stay'],
    ] : isDayTour ? [
      ['Visit Date', date(booking.check_in)],
      ['Park / Tour Timings', `${displayTime(booking.check_in_time, '09:30')} to ${displayTime(booking.check_out_time, '18:00')}`],
      ['Duration', '1 Day Tour'],
    ] : [
      ['Check-in (from)', `${date(booking.check_in)} · ${displayTime(booking.check_in_time, DEFAULT_CHECK_IN_TIME)}`],
      ['Check-out (by)', `${date(booking.check_out)} · ${displayTime(booking.check_out_time, DEFAULT_CHECK_OUT_TIME)}`],
      ['Duration', `${booking.nights} Night(s)`],
    ]),
    ['Total Bill', CURRENCY.format(total)],
    ...(booking.discount > 0 ? [['Discount applied', `−${CURRENCY.format(Number(booking.discount))}`]] : []),
    ...(pending > 0 ? [
      ['Advance paid', CURRENCY.format(paidSoFar)],
      ['Pending balance', `${CURRENCY.format(pending)} (Due at check-in)`],
    ] : [
      ['Amount paid', CURRENCY.format(paidSoFar || total)],
    ]),
    // Aadhaar info
    ...(booking.aadhaar_number ? [
      ['', ''], // spacer
      ['Govt ID (Aadhaar)', booking.aadhaar_number],
    ] : []),
  ]
}

function invoiceHtml(booking, { recipient = 'guest', paymentSource } = {}) {
  const pending = Number(booking.pending_amount || 0)
  const rows = invoiceRows(booking).map(([label, value]) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e6ece8;color:#5b6a63">${safe(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e6ece8;font-weight:600;color:#173d35">${safe(value)}</td></tr>`).join('')
  const guestMessage = recipient === 'guest'
    ? `<p style="margin:0 0 16px;color:#334b40">Hello ${safe(booking.name)}, your ${pending > 0 ? 'advance payment has been received and your booking is confirmed' : 'payment has been received in full and your booking is confirmed'}. Please keep this invoice for your records.</p>`
    : `<p style="margin:0 0 16px;color:#334b40">A payment has been confirmed${paymentSource ? ` via ${safe(paymentSource)}` : ''}. The latest 30-day booking report is attached.</p>`
  
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const payBalanceUrl = `${appUrl}/pay/${encodeURIComponent(booking.id)}`
  
  const pendingBalanceCard = (recipient === 'guest' && pending > 0)
    ? `<div style="margin:20px 0;padding:20px;background:#fef9ee;border:1px solid #f6d892;border-radius:12px">
        <div style="color:#925f0a;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">⏳ Pending Balance Due</div>
        <div style="font-size:24px;font-weight:700;color:#173d35;margin:6px 0">${CURRENCY.format(pending)}</div>
        <p style="margin:0 0 16px;font-size:13px;color:#5a4918;line-height:1.5">
          Your advance booking is confirmed! You can clear your remaining balance of <strong>${CURRENCY.format(pending)}</strong> anytime online before your stay, or upon arrival at the resort.
        </p>
        <a href="${payBalanceUrl}" style="display:inline-block;padding:12px 24px;background:#173d35;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;box-shadow:0 2px 4px rgba(0,0,0,0.1)">
          Pay Pending Balance Online (${CURRENCY.format(pending)}) &rarr;
        </a>
      </div>`
    : ''

  const contactPhone = process.env.OWNER_CONTACT_PHONE?.trim() || DEFAULT_CONTACT_PHONE
  const configuredMapUrl = process.env.RESORT_MAP_URL?.trim()
  const mapUrl = configuredMapUrl?.startsWith('https://') ? configuredMapUrl : DEFAULT_MAP_URL
  const guestContact = recipient === 'guest'
    ? `<div style="margin-top:22px;padding:16px;border-radius:10px;background:#f3f5ef;color:#173d35"><strong style="font-size:15px">Need help with your booking?</strong><p style="margin:8px 0 0;font-size:14px">Call the resort owner at <a href="tel:${safe(contactPhone.replace(/[^+\d]/g, ''))}" style="color:#315d4c;font-weight:700;text-decoration:none">${safe(contactPhone)}</a>.</p><p style="margin:8px 0 0;font-size:14px"><a href="${safe(mapUrl)}" style="color:#315d4c;font-weight:700">Open Siddhi Farm Resort in Google Maps →</a></p></div>`
    : ''

  // Terms and conditions summary
  const terms = normaliseBookingTerms({
    version: booking.terms_version,
    terms: booking.terms_content,
  })
  const termsList = (terms.terms || []).map(t => `<li style="margin:0 0 6px">${safe(t)}</li>`).join('')
  const termsSection = recipient === 'guest' && termsList
    ? `<div style="margin-top:24px;padding-top:20px;border-top:1px solid #dbe4d7">
        <h3 style="margin:0 0 10px;font-size:15px;color:#173d35">📜 Booking Terms & House Rules (v${safe(terms.version)})</h3>
        <ol style="padding-left:18px;margin:0;font-size:12px;color:#55665d;line-height:1.55">
          ${termsList}
        </ol>
      </div>`
    : ''

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f5ef;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #dbe4d7;border-radius:14px;overflow:hidden"><div style="padding:22px 28px;background:#173d35;color:#fff"><div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#d5b36a">${pending > 0 ? 'Advance Booking Confirmed' : 'Booking Confirmed'}</div><h1 style="margin:8px 0 0;font-size:26px;font-weight:600">${RESORT_NAME}</h1></div><div style="padding:28px">${guestMessage}${pendingBalanceCard}<h2 style="margin:20px 0 10px;font-size:18px;color:#173d35">Booking invoice</h2><table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>${guestContact}${termsSection}<p style="margin:20px 0 0;color:#68756e;font-size:12px">Recorded on ${safe(date(new Date(), true))}. For help, reply to this email and quote booking ${safe(booking.id)}.</p></div></div></body></html>`
}

async function createBookingsWorkbook(bookings) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = RESORT_NAME
  workbook.created = new Date()
  const sheet = workbook.addWorksheet('Last 30 Days Bookings', { views: [{ state: 'frozen', ySplit: 2 }] })
  sheet.mergeCells('A1:P1')
  const title = sheet.getCell('A1')
  title.value = `${RESORT_NAME} — Bookings created in the last 30 days`
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF173D35' } }
  title.alignment = { horizontal: 'center' }

  sheet.columns = [
    { key: 'id', width: 17 }, { key: 'name', width: 24 }, { key: 'phone', width: 16 },
    { key: 'service', width: 29 }, { key: 'guests', width: 10 }, { key: 'checkIn', width: 15 },
    { key: 'checkInTime', width: 16 }, { key: 'checkOut', width: 15 }, { key: 'checkOutTime', width: 16 },
    { key: 'nights', width: 9 }, { key: 'totalBill', width: 16 }, { key: 'paidAmount', width: 16 }, { key: 'pendingAmount', width: 16 },
    { key: 'paymentStatus', width: 16 }, { key: 'status', width: 15 }, { key: 'createdAt', width: 22 },
  ]
  const header = sheet.addRow(['Booking ID', 'Customer name', 'Phone', 'Service', 'Guests', 'Check-in', 'Check-in time', 'Check-out', 'Check-out time', 'Nights', 'Total Bill (INR)', 'Paid (INR)', 'Pending (INR)', 'Payment Status', 'Booking Status', 'Booked at'])
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF315D4C' } }
  header.alignment = { vertical: 'middle', wrapText: true }

  for (const booking of bookings) {
    const pending = Number(booking.pending_amount || 0)
    const paidSoFar = Number(booking.paid_amount || (booking.paid ? booking.amount : 0))
    const total = Number(booking.total_amount || (Number(booking.amount || 0) + pending))
    const payStatus = pending > 0 ? (booking.paid ? 'Advance Paid' : 'Unpaid') : (booking.paid ? 'Fully Paid' : 'Unpaid')
    const row = sheet.addRow({
      id: booking.id, name: booking.name, phone: booking.phone, service: booking.service,
      guests: Number(booking.guests || 0), checkIn: new Date(booking.check_in),
      checkInTime: displayTime(booking.check_in_time, DEFAULT_CHECK_IN_TIME), checkOut: new Date(booking.check_out),
      checkOutTime: displayTime(booking.check_out_time, DEFAULT_CHECK_OUT_TIME), nights: Number(booking.nights || 0),
      totalBill: total,
      paidAmount: paidSoFar,
      pendingAmount: pending,
      paymentStatus: payStatus,
      status: booking.status,
      createdAt: new Date(booking.created_at),
    })
    row.getCell('F').numFmt = 'dd-mmm-yyyy'
    row.getCell('H').numFmt = 'dd-mmm-yyyy'
    row.getCell('K').numFmt = '₹#,##0'
    row.getCell('L').numFmt = '₹#,##0'
    row.getCell('M').numFmt = '₹#,##0'
    row.getCell('P').numFmt = 'dd-mmm-yyyy hh:mm'
  }

  sheet.autoFilter = { from: 'A2', to: `P${Math.max(2, sheet.rowCount)}` }
  sheet.getRow(1).height = 25
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function getMailConfig() {
  const user = process.env.GMAIL_USER?.trim()
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')
  const owners = (process.env.OWNER_EMAILS || '').split(',').map(email => email.trim()).filter(Boolean)
  return { user, appPassword, owners }
}

function termsEmailHtml(booking, bookingTerms) {
  const terms = normaliseBookingTerms({
    version: booking.terms_version || bookingTerms?.version,
    terms: booking.terms_content || bookingTerms?.terms,
  })
  const BOOKING_TERMS_VERSION = terms.version
  const BOOKING_TERMS = terms.terms
  const termRows = BOOKING_TERMS.map(term => `<li style="margin:0 0 8px">${safe(term)}</li>`).join('')
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f5ef;font-family:Arial,sans-serif"><div style="max-width:640px;margin:auto;background:#ffffff;border:1px solid #dbe4d7;border-radius:14px;overflow:hidden"><div style="padding:22px 28px;background:#173d35;color:#fff"><div style="font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#d5b36a">Booking terms</div><h1 style="margin:8px 0 0;font-size:26px;font-weight:600">${RESORT_NAME}</h1></div><div style="padding:28px;color:#334b40"><p style="margin:0 0 16px">Hello ${safe(booking.name)}, we received your booking request <strong>${safe(booking.id)}</strong> for ${safe(booking.service)}. You accepted the following terms and conditions (version ${BOOKING_TERMS_VERSION}):</p><ol style="padding-left:20px;font-size:14px;line-height:1.45">${termRows}</ol><p style="margin:20px 0 0;color:#68756e;font-size:12px">Keep this email for your records. Payment and booking confirmation are sent separately.</p></div></div></body></html>`
}

/** Sends the booking terms immediately after a customer creates a booking request. */
export async function sendBookingTermsEmail(booking, bookingTerms) {
  const { user, appPassword } = getMailConfig()
  if (!user || !appPassword || !booking.email) return { sent: false, reason: 'gmail-not-configured-or-no-customer-email' }
  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } })
    await transporter.sendMail({
      from: `${RESORT_NAME} <${process.env.GMAIL_FROM?.trim() || user}>`,
      to: booking.email,
      subject: `Booking terms & conditions — ${booking.id}`,
      html: termsEmailHtml(booking, bookingTerms),
    })
    return { sent: true }
  } catch (error) {
    console.error(`Booking terms email failed for ${booking.id}:`, error)
    return { sent: false, reason: 'delivery-failed' }
  }
}

/** Sends the customer invoice and a separate owner email with the 30-day XLSX report. */
export async function sendPaidBookingEmails({ booking, last30DaysBookings, paymentSource, sendCustomer = true, sendOwners = true }) {
  const { user, appPassword, owners } = getMailConfig()
  if (!user || !appPassword) {
    console.warn('Payment email skipped: GMAIL_USER or GMAIL_APP_PASSWORD is not configured.')
    return { sent: false, reason: 'gmail-not-configured' }
  }

  const pending = Number(booking.pending_amount || 0)
  const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } })
  const jobs = []
  if (sendCustomer && booking.email) {
    jobs.push(transporter.sendMail({
      from: `${RESORT_NAME} <${process.env.GMAIL_FROM?.trim() || user}>`,
      to: booking.email,
      subject: pending > 0 ? `Advance payment received — booking ${booking.id}` : `Payment received — booking ${booking.id}`,
      html: invoiceHtml(booking, { recipient: 'guest', paymentSource }),
    }))
  }

  if (sendOwners && owners.length) {
    const report = await createBookingsWorkbook(last30DaysBookings)
    const filename = `siddhi-farm-bookings-last-30-days-${new Date().toISOString().slice(0, 10)}.xlsx`
    for (const owner of owners) {
      jobs.push(transporter.sendMail({
        from: `${RESORT_NAME} <${process.env.GMAIL_FROM?.trim() || user}>`,
        to: owner,
        subject: pending > 0 ? `[Advance Paid] Booking ${booking.id} — ${booking.name}` : `[Fully Paid] Booking ${booking.id} — ${booking.name}`,
        html: invoiceHtml(booking, { recipient: 'owner', paymentSource }),
        attachments: [{ filename, content: report, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
      }))
    }
  }

  if (!jobs.length) {
    console.warn(`Payment email skipped for ${booking.id}: no customer or owner email recipient configured.`)
    return { sent: false, reason: 'no-recipients' }
  }
  await Promise.all(jobs)
  return { sent: true, customer: sendCustomer && Boolean(booking.email), owners: sendOwners ? owners.length : 0 }
}

/**
 * Sends an instant email notification to resort owners/super-admins whenever admin configurations are modified.
 * @param {object} params
 * @param {string} params.category - E.g. 'Pricing Matrix', 'Coupons', 'Flash Sale', 'Payments', 'Terms', 'User Management'
 * @param {string} params.action - E.g. 'Rates Updated', 'Coupon Created', 'Flash Sale Scheduled'
 * @param {string} params.changedBy - Operator email
 * @param {string} [params.role] - Operator role
 * @param {object|string} [params.details] - Key/value pairs or description of changes
 * @param {string[]} [params.additionalRecipients] - Additional super admin emails if needed
 */
export async function sendAdminConfigAlert({ category, action, changedBy, role = 'admin', details = {}, additionalRecipients = [] }) {
  const { user, appPassword, owners } = getMailConfig()
  if (!user || !appPassword) {
    console.warn(`[ALERT:SKIPPED] Cannot send config alert for "${category} - ${action}": GMAIL credentials not set.`)
    return { sent: false, reason: 'gmail-not-configured' }
  }

  const recipients = Array.from(new Set([...owners, ...(additionalRecipients || [])])).filter(Boolean)
  if (!recipients.length) {
    recipients.push(user)
  }

  const timestamp = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date())

  let detailsHtml = ''
  if (typeof details === 'string') {
    detailsHtml = `<p style="margin:8px 0;font-size:14px;line-height:1.5;color:#334b40">${safe(details)}</p>`
  } else if (typeof details === 'object' && details !== null) {
    const rows = Object.entries(details).map(([k, v]) => {
      const valStr = typeof v === 'object' && v !== null ? JSON.stringify(v, null, 2) : String(v ?? '—')
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eef2eb;font-weight:600;color:#173d35;font-size:13px;width:35%">${safe(k)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eef2eb;color:#475569;font-size:13px;word-break:break-word"><pre style="margin:0;font-family:inherit;white-space:pre-wrap">${safe(valStr)}</pre></td>
      </tr>`
    }).join('')

    detailsHtml = `<table style="width:100%;border-collapse:collapse;margin-top:12px;background:#fbfdfa;border:1px solid #dfe7dc;border-radius:8px;overflow:hidden">
      ${rows}
    </table>`
  }

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f3f5ef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <div style="max-width:620px;margin:auto;background:#ffffff;border:1px solid #dbe4d7;border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(0,0,0,0.06)">
    <div style="padding:20px 24px;background:#173d35;color:#ffffff">
      <div style="font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#d5b36a">⚙️ Resort Configuration Alert</div>
      <h1 style="margin:6px 0 0;font-size:22px;font-weight:600">${safe(category)}: ${safe(action)}</h1>
    </div>
    <div style="padding:24px;color:#1f2937">
      <div style="background:#f4f7f2;border-left:4px solid #315d4c;padding:12px 16px;border-radius:4px;margin-bottom:18px">
        <p style="margin:0;font-size:13px;color:#173d35">
          <strong>Modified by:</strong> ${safe(changedBy)} (${safe((role || 'admin').replace('_', ' '))})<br/>
          <strong>Timestamp:</strong> ${safe(timestamp)} (IST)
        </p>
      </div>
      <h3 style="margin:0 0 8px;font-size:15px;color:#173d35">Change Summary / Details:</h3>
      ${detailsHtml}
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">
        This is an automated administrative security notification dispatched by Siddhi Farm Resort Operations Desk.
      </div>
    </div>
  </div>
</body>
</html>`

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: appPassword } })
    await transporter.sendMail({
      from: `${RESORT_NAME} Security <${process.env.GMAIL_FROM?.trim() || user}>`,
      to: recipients.join(', '),
      subject: `[Admin Alert] ${category}: ${action}`,
      html,
    })
    console.log(`[ALERT:DISPATCHED] Config alert sent to [${recipients.join(', ')}] for "${category} - ${action}"`)
    return { sent: true, count: recipients.length }
  } catch (error) {
    console.error(`[ALERT:FAILED] Failed to send config alert:`, error)
    return { sent: false, error: error.message }
  }
}

